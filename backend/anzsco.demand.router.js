// anzsco.demand.router.js  —— 覆盖整个文件
import express from 'express';

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
  // 传缩写就映射全称；传全称就原样；否则原样
  return STATE_ALIASES.get(key) || s;
}

export default function initAnzscoDemandRoutes(pool) {
  const router = express.Router();

  // GET /api/anzsco/:code/demand?state=VIC&latest=true
  router.get('/:code/demand', async (req, res) => {
    const code   = req.params.code?.trim();
    const stateQ = req.query.state?.trim();
    const latest = (req.query.latest ?? 'true') !== 'false';
    if (!code || !stateQ) return res.status(400).json({ error: 'anzsco_code and state required' });

    const state = normalizeState(stateQ);

    const conn = await pool.getConnection();
    try {
      const [[anz]] = await conn.query(
        `SELECT anzsco_code, anzsco_title FROM anzsco_data WHERE anzsco_code = ?`,
        [code]
      );
      if (!anz) return res.status(404).json({ error: 'ANZSCO code not found' });

      let targetDate = null;
      if (latest) {
        const [[row]] = await conn.query(
          `SELECT MAX(date) AS latest_date
             FROM nero_extract
            WHERE anzsco_code = ?
              AND (state_name = ? OR LOWER(state_name) = LOWER(?))`,
          [code, state, state]   // 同时支持大小写差异
        );
        if (!row?.latest_date) {
          return res.json({ anzsco: anz, state, date: null, summary: { state_total: 0 }, sa4: [] });
        }
        targetDate = row.latest_date;
      }

      const params = latest
        ? [code, state, state, targetDate]
        : [code, state, state];

      const dateFilter = latest ? ' AND ne.date = ?' : '';

      const [rows] = await conn.query(
        `SELECT ne.sa4_code, s.sa4_name, ne.date, ne.nsc_emp
           FROM nero_extract ne
      LEFT JOIN sa4_data s ON s.sa4_code = ne.sa4_code
          WHERE ne.anzsco_code = ?
            AND (ne.state_name = ? OR LOWER(ne.state_name) = LOWER(?)) ${dateFilter}
       ORDER BY ne.date DESC, ne.sa4_code`,
        params
      );

      const date = latest ? targetDate : (rows[0]?.date ?? null);
      const vals = rows.map(r => r.nsc_emp ?? 0);
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;

      const sa4 = rows.map(r => ({
        sa4_code: r.sa4_code,
        sa4_name: r.sa4_name,
        nsc_emp: r.nsc_emp,
        demand_index: max === min ? 0 : (r.nsc_emp - min) / (max - min)
      }));

      return res.json({
        anzsco: anz,
        state,
        date,
        summary: { state_total: vals.reduce((a, b) => a + (b || 0), 0) },
        sa4
      });
    } catch (e) {
      console.error('demand error:', e);
      return res.status(500).json({ error: 'internal_error' });
    } finally {
      conn.release();
    }
  });

  return router;
}
