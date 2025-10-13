import express from "express";
import { json as cache, withSingleFlight } from '../cache.js';

/**
 * @openapi
 * /api/shortage/by-anzsco:
 *   post:
 *     tags: [Shortage]
 *     summary: Query shortage metrics by ANZSCO prefix (first 4 digits)
 *     description: |
 *       Provide a 4–6 digit ANZSCO code. The server will match by the **first 4 digits**
 *       and return three sections: `latest_by_state`, `stats_by_state`, and `yearly_trend`.
 *     x-summary-zh: 按 ANZSCO 前 4 位查询短缺相关指标
 *     x-description-zh: |
 *       传入 4~6 位 ANZSCO 代码；后端仅以**前 4 位**进行匹配与聚合。
 *       返回三部分：`latest_by_state`（各州最新日期值）、`stats_by_state`（各州全历史统计）、
 *       `yearly_trend`（各州逐年均值）。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ByAnzscoRequest'
 *           examples:
 *             four_digits:
 *               summary: 4-digit input
 *               x-summary-zh: 仅 4 位
 *               value: { "anzsco_code": "1111" }
 *             six_digits:
 *               summary: 6-digit input (matched by first 4)
 *               x-summary-zh: 6 位（按前 4 位匹配）
 *               value: { "anzsco_code": "111111" }
 *     responses:
 *       200:
 *         description: Returns query meta, latest values per state, whole-history stats per state, and yearly averages per state.
 *         x-description-zh: 返回查询信息、各州最新值、各州全历史统计与各州年度均值。
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ByAnzscoResponse'
 *             examples:
 *               sample:
 *                 summary: Sample response (truncated)
 *                 x-summary-zh: 示例（节选）
 *                 value:
 *                   query: { input_code: "111111", match_prefix4: "1111" }
 *                   latest_by_state:
 *                     - state: "Australian Capital Territory"
 *                       date: "2025-08-14T14:00:00.000Z"
 *                       nsc_emp: 1030
 *                     - state: "New South Wales"
 *                       date: "2025-08-14T14:00:00.000Z"
 *                       nsc_emp: 1332
 *                   stats_by_state:
 *                     - state: "New South Wales"
 *                       samples: 3360
 *                       first_date: "2015-09-14T14:00:00.000Z"
 *                       last_date: "2025-08-14T14:00:00.000Z"
 *                       avg_nsc_emp: "649.2399"
 *                       stddev_nsc_emp: 548.3592611837385
 *                       min_nsc_emp: 71
 *                       max_nsc_emp: 3847
 *                   yearly_trend:
 *                     - state: "New South Wales"
 *                       year: 2024
 *                       avg_nsc_emp: "637.1667"
 *                     - state: "New South Wales"
 *                       year: 2025
 *                       avg_nsc_emp: "621.6518"
 *       400:
 *         description: Invalid request (e.g., `anzsco_code` not 4–6 digits).
 *         x-description-zh: 无效请求（例如 `anzsco_code` 不是 4~6 位数字）。
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid:
 *                 summary: Invalid code format
 *                 x-summary-zh: 代码格式错误
 *                 value: { error: "anzsco_code must be 4–6 digits" }
 *       500:
 *         description: Internal server error.
 *         x-description-zh: 服务器内部错误。
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * components:
 *   schemas:
 *     ByAnzscoRequest:
 *       type: object
 *       required: [anzsco_code]
 *       properties:
 *         anzsco_code:
 *           type: string
 *           pattern: '^[0-9]{4,6}$'
 *           description: ANZSCO code (4–6 digits). The server matches using the **first 4 digits**.
 *           x-description-zh: ANZSCO 代码（4~6 位），后端以**前 4 位**匹配。
 *           example: "261313"
 *
 *     ByAnzscoResponse:
 *       type: object
 *       description: Query result including meta, `latest_by_state`, `stats_by_state`, and `yearly_trend`.
 *       x-description-zh: 查询结果，包含 `query`、`latest_by_state`、`stats_by_state`、`yearly_trend`。
 *       properties:
 *         query:
 *           $ref: '#/components/schemas/QueryMeta'
 *         latest_by_state:
 *           type: array
 *           description: Latest `nsc_emp` per state (by most recent date).
 *           x-description-zh: 各州“最新日期”的 `nsc_emp`。
 *           items:
 *             $ref: '#/components/schemas/LatestByState'
 *         stats_by_state:
 *           type: array
 *           description: Whole-history statistics per state.
 *           x-description-zh: 各州完整历史统计。
 *           items:
 *             $ref: '#/components/schemas/StatsByState'
 *         yearly_trend:
 *           type: array
 *           description: Yearly average `nsc_emp` per state (calendar year).
 *           x-description-zh: 各州按日历年的 `nsc_emp` 年度均值。
 *           items:
 *             $ref: '#/components/schemas/YearlyTrend'
 *
 *     QueryMeta:
 *       type: object
 *       properties:
 *         input_code:
 *           type: string
 *           description: Original code provided (4–6 digits).
 *           x-description-zh: 客户端传入的原始代码（4~6 位）。
 *           example: "111111"
 *         match_prefix4:
 *           type: string
 *           description: First 4-digit prefix used for filtering.
 *           x-description-zh: 用于筛选的前 4 位前缀。
 *           example: "1111"
 *
 *     LatestByState:
 *       type: object
 *       properties:
 *         state:
 *           type: string
 *           description: Normalized Australian state name.
 *           x-description-zh: 归一化后的澳洲州名。
 *           example: "New South Wales"
 *         date:
 *           type: string
 *           format: date-time
 *           description: Most recent record date (UTC ISO 8601).
 *           x-description-zh: 最新记录日期（UTC ISO 8601）。
 *           example: "2025-08-14T14:00:00.000Z"
 *         nsc_emp:
 *           type: number
 *           format: float
 *           description: "Value of `nsc_emp` on the latest date."
 *           x-description-zh: "最新日期对应的 `nsc_emp` 数值。"
 *           example: 1332
 *
 *     StatsByState:
 *       type: object
 *       properties:
 *         state:
 *           type: string
 *           example: "New South Wales"
 *         samples:
 *           type: integer
 *           description: Sample size (row count).
 *           x-description-zh: 样本量（行数）。
 *           example: 3360
 *         first_date:
 *           type: string
 *           format: date-time
 *           description: Earliest matched record date.
 *           x-description-zh: 最早匹配到的记录日期。
 *           example: "2015-09-14T14:00:00.000Z"
 *         last_date:
 *           type: string
 *           format: date-time
 *           description: Latest matched record date.
 *           x-description-zh: 最新匹配到的记录日期。
 *           example: "2025-08-14T14:00:00.000Z"
 *         avg_nsc_emp:
 *           type: string
 *           description: Average value returned by SQL (string).
 *           x-description-zh: SQL 返回的平均值（字符串）。
 *           example: "649.2399"
 *         stddev_nsc_emp:
 *           type: number
 *           format: float
 *           description: "Sample standard deviation of `nsc_emp`."
 *           x-description-zh: "`nsc_emp` 的样本标准差。"
 *           example: 548.3592611837385
 *         min_nsc_emp:
 *           type: number
 *           format: float
 *           description: "Minimum of `nsc_emp`."
 *           x-description-zh: "`nsc_emp` 最小值。"
 *           example: 71
 *         max_nsc_emp:
 *           type: number
 *           format: float
 *           description: "Maximum of `nsc_emp`."
 *           x-description-zh: "`nsc_emp` 最大值。"
 *           example: 3847
 *
 *     YearlyTrend:
 *       type: object
 *       properties:
 *         state:
 *           type: string
 *           example: "New South Wales"
 *         year:
 *           type: integer
 *           description: Calendar year.
 *           x-description-zh: 日历年。
 *           example: 2024
 *         avg_nsc_emp:
 *           type: string
 *           description: "Yearly average of `nsc_emp` (string from SQL)."
 *           x-description-zh: "年度 `nsc_emp` 均值（SQL 返回的字符串）。"
 *           example: "637.1667"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "internal_error"
 */
export default function buildRouter(pool) {
  const router = express.Router();

  // Unify state names to avoid VIC/Victoria being split into two groups
  const normState = `
  CASE
    WHEN state_name IN ('NSW','New South Wales') THEN 'New South Wales'
    WHEN state_name IN ('VIC','Victoria') THEN 'Victoria'
    WHEN state_name IN ('QLD','Queensland') THEN 'Queensland'
    WHEN state_name IN ('SA','South Australia') THEN 'South Australia'
    WHEN state_name IN ('WA','Western Australia') THEN 'Western Australia'
    WHEN state_name IN ('TAS','Tasmania') THEN 'Tasmania'
    WHEN state_name IN ('NT','Northern Territory') THEN 'Northern Territory'
    WHEN state_name IN ('ACT','Australian Capital Territory') THEN 'Australian Capital Territory'
    ELSE state_name
  END
  `;

  //Get the first 4 characters of a string
  const fourDigitFilter = `
  LEFT(TRIM(CAST(anzsco_code AS CHAR)), 4) = ?
  `;

  // 1 nsc_emp for each state with the latest date
  const SQL_LATEST_BY_STATE = `
  WITH filtered AS (
    SELECT ${normState} AS state, date, nsc_emp
    FROM temp_nero_extract
    WHERE ${fourDigitFilter}
  ),
  ranked AS (
    SELECT state, date, nsc_emp,
           ROW_NUMBER() OVER (PARTITION BY state ORDER BY date DESC) AS rn
    FROM filtered
  )
  SELECT state, date, nsc_emp
  FROM ranked
  WHERE rn = 1
  ORDER BY state;
  `;

  // 2  Historical statistics (entire history of each state)
  const SQL_STATS_BY_STATE = `
  SELECT
    ${normState} AS state,
    COUNT(*)              AS samples,
    MIN(date)             AS first_date,
    MAX(date)             AS last_date,
    AVG(nsc_emp)          AS avg_nsc_emp,
    STDDEV_SAMP(nsc_emp)  AS stddev_nsc_emp,
    MIN(nsc_emp)          AS min_nsc_emp,
    MAX(nsc_emp)          AS max_nsc_emp
  FROM temp_nero_extract
  WHERE ${fourDigitFilter}
  GROUP BY state
  ORDER BY state;
  `;

  // 3 Annual average per state
  const SQL_YEARLY_TREND = `
  SELECT
    ${normState} AS state,
    YEAR(date) AS year,
    AVG(nsc_emp) AS avg_nsc_emp
  FROM temp_nero_extract
  WHERE ${fourDigitFilter}
  GROUP BY state, YEAR(date)
  ORDER BY state, year;
  `;

  /**
   * POST /api/shortage/by-anzsco
   * body: { "anzsco_code": "261313" }   // 4~6 
   */
  router.post("/shortage/by-anzsco", async (req, res) => {
    try {
      // 1) 参数校验
      const raw = String(req.body?.anzsco_code ?? "").trim();
      if (!raw || !/^\d{4,6}$/.test(raw)) {
        return res.status(400).json({ error: "anzsco_code must be 4–6 digits" });
      }
      const prefix4 = raw.slice(0, 4);

      // 2) 构造缓存 Key（按前4位聚合）
      const cacheKey = `sb:shortage:by-anzsco:v1:${prefix4}`;
      const TTL_SEC = 12 * 60 * 60; // 12 小时

      // 3) 先查缓存
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // 4) 未命中时用 single-flight：并发仅让一个请求落库，其他等缓存结果
      const payload = await withSingleFlight(cacheKey, TTL_SEC, async () => {
        const conn = await pool.getConnection();
        try {
          // 注意：如果你的 SQL 还是用 LEFT(anzsco_code,4)=?，这里传 prefix4 即可；
          // 如果后续把表加了生成列 prefix4，则 SQL 里可直接用 prefix4=?
          const [latest] = await conn.query(SQL_LATEST_BY_STATE, [prefix4]);
          const [stats] = await conn.query(SQL_STATS_BY_STATE, [prefix4]);
          const [yearly] = await conn.query(SQL_YEARLY_TREND, [prefix4]);

          // 统一响应体（也是缓存的内容）
          return {
            query: { input_code: raw, match_prefix4: prefix4 },
            latest_by_state: latest,   // 各州最近一次
            stats_by_state: stats,    // 历史统计
            yearly_trend: yearly    // 年度均值
          };
        } finally {
          conn.release();
        }
      });

      // 5) 返回（single-flight 内已写缓存；若你想在这里手动回写也可以）
      return res.json(payload);
    } catch (err) {
      console.error("[/shortage/by-anzsco] error:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });
  return router;  // ★★★ 别忘了返回 router ★★★
}
