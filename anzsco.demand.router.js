// anzsco.demand.router.js
import express from 'express';

/**
 * 本路由读取 shortage_list（蛇形命名字段）
 * 字段（根据你给的ERD）：
 *  - anzsco_code (PK)
 *  - national_shortage_rating
 *  - new_south_wales_shortage_rating
 *  - victoria_shortage_rating
 *  - queensland_shortage_rating
 *  - south_australia_shortage_rating
 *  - western_australia_shortage_rating
 *  - tasmania_shortage_rating
 *  - northern_territory_shortage_rating
 *  - Fieldaustralian_capital_territory_shortage_rating   <-- 注意这个名字
 *  - skill_level
 */

const STATE_COLUMN_MAP = {
  NSW: 'new_south_wales_shortage_rating',
  VIC: 'victoria_shortage_rating',
  QLD: 'queensland_shortage_rating',
  SA:  'south_australia_shortage_rating',
  WA:  'western_australia_shortage_rating',
  TAS: 'tasmania_shortage_rating',
  NT:  'northern_territory_shortage_rating',
  ACT: 'Fieldaustralian_capital_territory_shortage_rating', // 按你图里的列名
};

const STATE_FULL_NAME = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  SA:  'South Australia',
  WA:  'Western Australia',
  TAS: 'Tasmania',
  NT:  'Northern Territory',
  ACT: 'Australian Capital Territory',
};

export default function initAnzscoDemandRoutes(pool) {
  const router = express.Router();

  // 读 anzsco 标题（若 shortage_list 不含标题，就从这里补）
  async function getAnzscoMeta(conn, code) {
    const [rows] = await conn.query(
      `SELECT anzsco_code, anzsco_title
         FROM anzsco_data
        WHERE anzsco_code = ?`,
      [code]
    );
    return rows?.[0] || null;
  }

  // 读 shortage_list 一行
  async function getShortageRow(conn, code) {
    const [rows] = await conn.query(
      `SELECT
          anzsco_code,
          national_shortage_rating,
          new_south_wales_shortage_rating,
          victoria_shortage_rating,
          queensland_shortage_rating,
          south_australia_shortage_rating,
          western_australia_shortage_rating,
          tasmania_shortage_rating,
          northern_territory_shortage_rating,
          Fieldaustralian_capital_territory_shortage_rating,
          skill_level
        FROM shortage_list
       WHERE anzsco_code = ?`,
      [code]
    );
    return rows?.[0] || null;
  }

  // 统一拼装“所有州”的返回体
  function shapeAll(meta, row) {
    return {
      anzsco: {
        anzsco_code: row?.anzsco_code ?? meta?.anzsco_code ?? null,
        anzsco_title: meta?.anzsco_title ?? null,
      },
      skill_level: row?.skill_level ?? null,
      ratings: {
        national: row?.national_shortage_rating ?? null,
        NSW: row?.new_south_wales_shortage_rating ?? null,
        VIC: row?.victoria_shortage_rating ?? null,
        QLD: row?.queensland_shortage_rating ?? null,
        SA:  row?.south_australia_shortage_rating ?? null,
        WA:  row?.western_australia_shortage_rating ?? null,
        TAS: row?.tasmania_shortage_rating ?? null,
        NT:  row?.northern_territory_shortage_rating ?? null,
        ACT: row?.Fieldaustralian_capital_territory_shortage_rating ?? null,
      },
    };
  }

  /**
   * GET /api/anzsco/:code/demand
   *  - ?state=VIC 可选；不传则返回全国 + 全州评级
   *
   * 示例：
   *  - /api/anzsco/261313/demand
   *  - /api/anzsco/261313/demand?state=VIC
   */
 /**
 * @openapi
 * /api/anzsco/{code}/demand:
 *   get:
 *     tags: [ANZSCO]
 *     summary: Shortage rating (national or by state) for an ANZSCO 6-digit code
 *     description: |
 *       Returns **national** shortage rating and (optionally) a **specific state** rating
 *       for an ANZSCO 6-digit code. If `state` is omitted, returns a map of all states.
 *     x-summary-zh: ANZSCO 六位的短缺评级（全国/按州）
 *     x-description-zh: |
 *       返回指定 ANZSCO 六位的 **全国**短缺评级；如提供 `state`，同时返回该州评级。
 *       省略 `state` 时返回 **全部州**的评级映射。
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, pattern: '^[0-9]{6}$' }
 *         description: ANZSCO 6-digit code.
 *       - in: query
 *         name: state
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ACT, NSW, NT, QLD, SA, TAS, VIC, WA]
 *         description: |
 *           Two/three-letter Australian state code (optional).
 *           If omitted, returns ratings for all states.
 *     responses:
 *       200:
 *         description: Demand rating payload
 *         content:
 *           application/json:
 *             oneOf:
 *               - $ref: '#/components/schemas/DemandAllStatesResponse'
 *               - $ref: '#/components/schemas/DemandOneStateResponse'
 *             examples:
 *               all_states:
 *                 summary: All states
 *                 value:
 *                   anzsco: { anzsco_code: "261313", anzsco_title: "Software Engineer" }
 *                   skill_level: "1"
 *                   ratings:
 *                     national: "Shortage"
 *                     NSW: "Shortage"
 *                     VIC: "Shortage"
 *               one_state:
 *                 summary: One state (VIC)
 *                 value:
 *                   anzsco: { anzsco_code: "261313", anzsco_title: "Software Engineer" }
 *                   skill_level: "1"
 *                   national_rating: "Shortage"
 *                   state: "Victoria"
 *                   state_code: "VIC"
 *                   state_rating: "Shortage"
 *       400:
 *         description: Invalid parameters
 *       404:
 *         description: No rating found
 *       500:
 *         description: Server error
 */
  router.get('/:code/demand', async (req, res) => {
    const code = String(req.params.code || '').trim();
    const state = String(req.query.state || '').trim().toUpperCase(); // NSW / VIC / ...

    if (!code) return res.status(400).json({ error: 'anzsco code required' });

    const conn = await pool.getConnection();
    try {
      const [meta, row] = await Promise.all([
        getAnzscoMeta(conn, code),
        getShortageRow(conn, code),
      ]);

      // shortage_list 里没这条
      if (!row) {
        return res.json({
          anzsco: meta || { anzsco_code: code, anzsco_title: null },
          skill_level: null,
          ...(state
            ? {
                state: STATE_FULL_NAME[state] || state,
                state_code: state,
                state_rating: null,
                national_rating: null,
              }
            : { ratings: {} }
          ),
        });
      }

      // 不带 state：返回所有州
      if (!state) {
        return res.json(shapeAll(meta, row));
      }

      // 带 state：只返回该州
      const stateCol = STATE_COLUMN_MAP[state];
      if (!stateCol) {
        return res.status(400).json({ error: 'invalid state code' });
      }

      return res.json({
        anzsco: meta || { anzsco_code: row.anzsco_code, anzsco_title: null },
        skill_level: row.skill_level ?? null,
        national_rating: row.national_shortage_rating ?? null,
        state: STATE_FULL_NAME[state] || state,
        state_code: state,
        state_rating: row[stateCol] ?? null,
      });
    } catch (e) {
      console.error('[anzsco/demand] error:', e);
      res.status(500).json({ error: 'internal_error' });
    } finally {
      conn.release();
    }
  });

  return router;
}
