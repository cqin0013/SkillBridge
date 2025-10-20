import express from "express";

import { json as cache, withSingleFlight, flushAll, delByPattern } from "../cache.js";


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
      // 1) Parameter verification
      const raw = String(req.body?.anzsco_code ?? "").trim();
      if (!raw || !/^\d{4,6}$/.test(raw)) {
        return res.status(400).json({ error: "anzsco_code must be 4–6 digits" });
      }
      const prefix4 = raw.slice(0, 4);

      // 2) Construct cache Key (aggregate by the first 4 bits)
      const cacheKey = `sb:shortage:by-anzsco:v1:${prefix4}`;
      const TTL_SEC = 7 * 24 * 60 * 60; // 24*7 小时

      // 3) Check the cache first
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // 4) Use single-flight when there is a miss: only one request is sent to the cache concurrently, and the others wait for the cached results.
      const payload = await withSingleFlight(cacheKey, TTL_SEC, async () => {
        const conn = await pool.getConnection();
        try {

          const [latest] = await conn.query(SQL_LATEST_BY_STATE, [prefix4]);
          const [stats] = await conn.query(SQL_STATS_BY_STATE, [prefix4]);
          const [yearly] = await conn.query(SQL_YEARLY_TREND, [prefix4]);

          return {
            query: { input_code: raw, match_prefix4: prefix4 },
            latest_by_state: latest,   // The latest state
            stats_by_state: stats,    // Historical Statistics
            yearly_trend: yearly    // Annual average
          };
        } finally {
          conn.release();
        }
      });

      // 5) return
      return res.json(payload);
    } catch (err) {
      console.error("[/shortage/by-anzsco] error:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });






  /**
   * @openapi
   * /api/admin/shortage/prewarm:
   *   post:
   *     tags: [Admin]
   *     summary: Prewarm cache for all 4-digit ANZSCO prefixes
   *     x-summary-zh: 预热所有 4 位 ANZSCO 前缀的缓存
   *     description: |
   *       Scans all distinct 4-digit prefixes in `temp_nero_extract`,
   *       computes `/api/shortage/by-anzsco` results for each, and writes them to Redis.
   *     x-description-zh: |
   *       扫描 `temp_nero_extract` 中所有出现过的 4 位前缀，
   *       逐一计算 `/api/shortage/by-anzsco` 的结果并写入 Redis。
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               ttlSec:
   *                 type: integer
   *                 example: 604800
   *                 description: Cache TTL (seconds), default 12 hours.
   *                 x-description-zh: 缓存 TTL（秒），默认 12 小时。
   *               concurrency:
   *                 type: integer
   *                 example: 4
   *                 description: Number of concurrent workers (1–8), default 4.
   *                 x-description-zh: 并发 worker 数（1–8），默认 4。
   *               dryRun:
   *                 type: boolean
   *                 example: false
   *                 description: List prefixes to process without actually writing to Redis.
   *                 x-description-zh: 仅列出待处理的前缀，不实际写入 Redis。
   *               onlyMiss:
   *                 type: boolean
   *                 example: true
   *                 description: Only process prefixes that are missing in cache.
   *                 x-description-zh: 仅处理未命中缓存的前缀。
   *     responses:
   *       200:
   *         description: Summary of prewarm execution.
   *         x-description-zh: 预热执行结果摘要。
   *       401:
   *         description: Unauthorized (missing or invalid x-admin-secret).
   *         x-description-zh: 未授权（缺少或错误的 x-admin-secret）。
   *       500:
   *         description: Internal server error.
   *         x-description-zh: 服务器内部错误。
   */

  router.post("/admin/shortage/prewarm", async (req, res) => {
    try {

      const adminSecret = process.env.ADMIN_SECRET;
      if (adminSecret && req.headers["x-admin-secret"] !== adminSecret) {
        return res.status(401).json({ error: "unauthorized" });
      }

      const TTL_SEC = Number(req.body?.ttlSec ?? 12 * 60 * 60); // 12hours
      const CONCURRENCY = Math.max(1, Math.min(8, Number(req.body?.concurrency ?? 4)));
      const DRY_RUN = !!req.body?.dryRun;   // Only the prefixes to be preheated are listed, not the actual ones stored in the database.
      const ONLY_MISS = !!req.body?.onlyMiss; // Only handle prefixes that have cache misses

      // 1) Pull all distinct 4-digit prefixes
      const conn = await pool.getConnection();
      let prefixes = [];
      try {
        const SQL_PREFIXES = `
        SELECT DISTINCT LEFT(TRIM(CAST(anzsco_code AS CHAR)), 4) AS prefix4
        FROM temp_nero_extract
        WHERE anzsco_code IS NOT NULL
          AND TRIM(CAST(anzsco_code AS CHAR)) <> ''
          AND CHAR_LENGTH(TRIM(CAST(anzsco_code AS CHAR))) >= 4
      `;
        const [rows] = await conn.query(SQL_PREFIXES);
        prefixes = rows
          .map(r => String(r.prefix4 ?? "").trim())
          .filter(p => /^\d{4}$/.test(p))
          .sort();
      } finally {
        conn.release();
      }

      // 2) Concurrent batch processing
      const cacheKeyOf = (p4) => `sb:shortage:by-anzsco:v1:${p4}`;

      // Calculate a prefix
      const computeOne = async (p4) => {
        const key = cacheKeyOf(p4);
        if (ONLY_MISS) {
          const hit = await cache.get(key);
          if (hit) return { prefix4: p4, skipped: "HIT" };
        }
        if (DRY_RUN) return { prefix4: p4, skipped: "DRY_RUN" };

        // single-flight Anti-breakdown: If multiple concurrent runs are run at the same time, the first one will take precedence.
        const payload = await withSingleFlight(key, TTL_SEC, async () => {
          const conn = await pool.getConnection();
          try {
            const [latest] = await conn.query(SQL_LATEST_BY_STATE, [p4]);
            const [stats] = await conn.query(SQL_STATS_BY_STATE, [p4]);
            const [yearly] = await conn.query(SQL_YEARLY_TREND, [p4]);
            return {
              query: { input_code: p4, match_prefix4: p4 },
              latest_by_state: latest,
              stats_by_state: stats,
              yearly_trend: yearly
            };
          } finally {
            conn.release();
          }
        });
        return { prefix4: p4, wrote: true, size: JSON.stringify(payload).length };
      };

      // Simple concurrency control
      const results = [];
      let idx = 0;
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (idx < prefixes.length) {
          const cur = prefixes[idx++];
          try {
            results.push(await computeOne(cur));
          } catch (e) {
            results.push({ prefix4: cur, error: e?.message || String(e) });
          }
        }
      });
      await Promise.all(workers);

      const summary = {
        total_prefixes: prefixes.length,
        ttlSec: TTL_SEC,
        concurrency: CONCURRENCY,
        dryRun: DRY_RUN,
        onlyMiss: ONLY_MISS,
        wrote: results.filter(r => r.wrote).length,
        skipped_hit: results.filter(r => r.skipped === "HIT").length,
        skipped_dry: results.filter(r => r.skipped === "DRY_RUN").length,
        errors: results.filter(r => r.error).length,
        sample: results.slice(0, 10) // Return to the previous 10 items
      };
      res.set("X-Prewarm-Total", String(prefixes.length));
      return res.json({ ok: true, summary });
    } catch (err) {
      console.error("[/admin/shortage/prewarm] error:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  /**
 * @openapi
 * /api/admin/redis/flush-all:
 *   post:
 *     tags: [Admin]
 *     summary: Flush all keys in Redis (DANGEROUS)
 *     x-summary-zh: 清空 Redis 全部键（危险操作）
 *     description: |
 *       Executes **FLUSHALL** to clear the entire Redis database,  
 *       including session keys (`sbridg:*`) and all business caches.  
 *       ⚠️ Use with caution in production.
 *     x-description-zh: |
 *       调用 **FLUSHALL** 命令清空 Redis 数据库，  
 *       包括会话键（`sbridg:*`）及所有业务缓存。  
 *       ⚠️ 生产环境慎用。
 *     responses:
 *       200:
 *         description: All keys flushed successfully.
 *         x-description-zh: 已成功清空全部键。
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 flushed:
 *                   type: string
 *                   example: ALL
 *             examples:
 *               success:
 *                 summary: Example success response
 *                 x-summary-zh: 成功示例响应
 *                 value: { "ok": true, "flushed": "ALL" }
 *       401:
 *         description: Unauthorized (missing or invalid x-admin-secret).
 *         x-description-zh: 未授权（缺少或错误的 x-admin-secret）。
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: Example unauthorized response
 *                 x-summary-zh: 未授权示例响应
 *                 value: { "error": "unauthorized" }
 *       500:
 *         description: Internal server error.
 *         x-description-zh: 服务器内部错误。
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               internal_error:
 *                 summary: Example internal error
 *                 x-summary-zh: 内部错误示例
 *                 value: { "error": "internal_error" }
 */

  router.post("/admin/redis/flush-all", async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      if (adminSecret && req.headers["x-admin-secret"] !== adminSecret) {
        return res.status(401).json({ error: "unauthorized" });
      }
      await flushAll(); // Note: The session will also be cleared
      return res.json({ ok: true, flushed: "ALL" });
    } catch (err) {
      console.error("[/admin/redis/flush-all] error:", err);
      return res.status(500).json({ error: "internal_error" });
    }
  });

  return router;  // ★★★ Don't forget to return to router ★★★

}

