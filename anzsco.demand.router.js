// anzsco.demand.router.js
import express from 'express';

// 州名缩写 ↔ 全称的宽松兼容
const STATE_ALIASES = new Map([
  ['nsw','New South Wales'],
  ['vic','Victoria'],
  ['qld','Queensland'],
  ['sa','South Australia'],
  ['wa','Western Australia'],
  ['tas','Tasmania'],
  ['act','Australian Capital Territory'],
  ['nt','Northern Territory'],
]);

function normalizeState(input) {
  if (!input) return null;
  const s = String(input).trim();
  const key = s.toLowerCase();
  // 传缩写就映射全称；传全称就原样回传
  return STATE_ALIASES.get(key) || s;
}

export default function initAnzscoDemandRoutes(pool) {
  const router = express.Router();

  /**
   * GET /api/anzsco/:code/demand?state=VIC&latest=true
   * 数据源：temp_nero_extract（不依赖正式表）
   * 返回：
   * {
   *   anzsco: { anzsco_code, anzsco_title },
   *   state, date,
   *   summary: { state_total },
   *   sa4: [{ sa4_code, sa4_name, nsc_emp, demand_index }]
   * }
   */
  router.get('/:code/demand', async (req, res) => {
    const code   = req.params.code?.trim();
    const stateQ = req.query.state?.trim();
    const latest = (req.query.latest ?? 'true') !== 'false';
    if (!code || !stateQ) {
      return res.status(400).json({ error: 'anzsco_code and state required' });
    }

    const state = normalizeState(stateQ);

    const conn = await pool.getConnection();
    try {
      // 1) 取职业名称（若没有也不报错，仅返回 code）
      const [[anz]] = await conn.query(
        `SELECT anzsco_code, anzsco_title FROM anzsco_data WHERE anzsco_code = ?`,
        [code]
      );
      const anzscoMeta = anz || { anzsco_code: code, anzsco_title: null };

      // 2) latest=true 时先拿最新日期（从 temp_nero_extract）
      let targetDate = null;
      if (latest) {
        const [[row]] = await conn.query(
          `SELECT MAX(date) AS latest_date
             FROM temp_nero_extract
            WHERE anzsco_code = ?
              AND (state_name = ? OR LOWER(state_name) = LOWER(?))`,
          [code, state, state]
        );
        targetDate = row?.latest_date || null;
      }

      const params = latest
        ? [code, state, state, targetDate]
        : [code, state, state];

      const dateFilter = latest ? ' AND ne.date = ?' : '';

      // 3) 读取该 code+state(+date) 的 SA4 明细
      const [rows] = await conn.query(
        `SELECT ne.sa4_code,
                s.sa4_name,
                ne.date,
                ne.nsc_emp
           FROM temp_nero_extract ne
      LEFT JOIN sa4_data s ON s.sa4_code = ne.sa4_code
          WHERE ne.anzsco_code = ?
            AND (ne.state_name = ? OR LOWER(ne.state_name) = LOWER(?)) ${dateFilter}
       ORDER BY ne.date DESC, ne.sa4_code`,
        params
      );

      // 无数据时返回空集合
      if (!rows.length) {
        return res.json({
          anzsco: anzscoMeta,
          state,
          date: latest ? targetDate : null,
          summary: { state_total: 0 },
          sa4: []
        });
      }

      // 若 latest=false，date 取第一条（已按 date desc 排好了）
      const date = latest ? targetDate : rows[0].date;

      // 汇总、归一化 demand_index
      const vals = rows.map(r => r.nsc_emp ?? 0);
      const min = Math.min(...vals);
      const max = Math.max(...vals);

      const sa4 = rows
        .filter(r => !date || String(r.date) === String(date)) // latest=false 时只回该日期的
        .map(r => ({
          sa4_code: r.sa4_code,
          sa4_name: r.sa4_name,
          nsc_emp: r.nsc_emp,
          demand_index: max === min ? 0 : (r.nsc_emp - min) / (max - min)
        }));

      const state_total = sa4.reduce((a, b) => a + (b.nsc_emp || 0), 0);

      return res.json({
        anzsco: anzscoMeta,
        state,
        date,
        summary: { state_total },
        sa4
      });
    } catch (e) {
      console.error('temp-demand error:', e);
      return res.status(500).json({ error: 'internal_error' });
    } finally {
      conn.release();
    }
  });

  return router;
}
