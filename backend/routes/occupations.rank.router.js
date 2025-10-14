import express from 'express';
import { json, withSingleFlight, stableHashSelections } from '../cache.js';

export default function initRankRoutes(pool) {
  const router = express.Router();


  const ensureArray = (a) => (Array.isArray(a) ? a : []);
  const strip = (s) => (s ?? '').replace(/[\r\n]/g, '');
/**
   * @openapi
   * /occupations/rank-by-codes:
   *   post:
   *     tags:
   *       - SOC
   *     summary: Rank occupations by selected ability codes and filter by industry
   *     description: |-
   *       Reverse-lookup by ability codes (knowledge / skill / tech), aggregate matches per occupation,
   *       and sort by a relevance score. The score increases with more matched codes and broader category coverage
   *       (knowledge/skill/tech). Optionally filters by **industry** (fuzzy, case-insensitive).
   *       Returns top-N most relevant occupations (default 10).
   *     x-summary-zh: 基于能力代码聚合并按行业筛选职业（含打分排序与前 N）
   *     x-description-zh: |-
   *       以知识、技能与技术代码反向聚合职业，并按“命中数量 + 类别覆盖度”计算相关性得分；
   *       可选地按 **行业名称**（模糊匹配、不区分大小写）进行过滤；默认返回得分最高的前 10 条。
   *
   *     parameters:
   *       - in: query
   *         name: industry
   *         required: false
   *         schema:
   *           type: string
   *         description: |-
   *           Optional industry name for filtering (fuzzy, case-insensitive). If provided,
   *           only occupations mapped to ANZSCO codes belonging to this industry are included.
   *         x-description-zh: |-
   *           可选的行业名称（模糊匹配，不区分大小写）。若传入，仅返回能映射到该行业 ANZSCO 的职业。
   *
   *       - in: query
   *         name: limit
   *         required: false
   *         schema:
   *           type: integer
   *           default: 10
   *           minimum: 1
   *           maximum: 50
   *         description: Maximum number of ranked results to return (default 10, max 50).
   *         x-description-zh: 返回的前 N 条结果（默认 10，最大 50）。
   *
   *       - in: query
   *         name: refresh
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["0", "1"]
   *         description: Bypass cache when `1`.
   *         x-description-zh: 当取值为 `1` 时跳过缓存。
   *
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               selections:
   *                 type: array
   *                 description: |-
   *                   Ability selections as objects with two fields: type and code.
   *                   `type` ∈ {knowledge, skill, tech}.
   *                 x-description-zh: |-
   *                   能力代码选择数组；每项包含 `type` 与 `code`。`type` 取值为 knowledge/skill/tech。
   *                 items:
   *                   type: object
   *                   required:
   *                     - type
   *                     - code
   *                   properties:
   *                     type:
   *                       type: string
   *                       enum:
   *                         - knowledge
   *                         - skill
   *                         - tech
   *                     code:
   *                       type: string
   *           examples:
   *             example:
   *               summary: Rank by ability codes with industry filter
   *               value:
   *                 selections:
   *                   - type: knowledge
   *                     code: "2.C.1.a"
   *                   - type: skill
   *                     code: "2.A.1.a"
   *                   - type: tech
   *                     code: "43231507"
   *                 industry: "Information Media and Telecommunications"
   *
   *     responses:
   *       '200':
   *         description: Ranked occupations by computed score, with mapped ANZSCO details.
   *         x-description-zh: 按综合得分排序的职业列表；每条包含映射到的 ANZSCO（代码/标题/描述）。
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total_selected:
   *                   type: integer
   *                   description: Count of unique selected codes.
   *                   x-description-zh: 去重后的能力代码总数。
   *                 industry:
   *                   type: string
   *                   nullable: true
   *                   description: Filtered industry name if provided.
   *                   x-description-zh: 若传入则显示筛选的行业名称。
   *                 limit:
   *                   type: integer
   *                   description: The applied limit for top-N results.
   *                   x-description-zh: 返回前 N 条的限制值。
   *                 items:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       occupation_code:
   *                         type: string
   *                         example: "15-2031.00"
   *                       occupation_title:
   *                         type: string
   *                         example: "Operations Research Analysts"
   *                       score:
   *                         type: number
   *                         example: 3.3
   *                       count:
   *                         type: integer
   *                         example: 3
   *                       anzsco:
   *                         type: array
   *                         items:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: "261313"
   *                             title:
   *                               type: string
   *                               nullable: true
   *                               example: "Software Engineer"
   *                             description:
   *                               type: string
   *                               nullable: true
   *                               example: "Designs, develops..."
   *                       unmatched:
   *                         type: object
   *                         properties:
   *                           knowledge:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 code:
   *                                   type: string
   *                                 title:
   *                                   type: string
   *                                   nullable: true
   *                           skill:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 code:
   *                                   type: string
   *                                 title:
   *                                   type: string
   *                                   nullable: true
   *                           tech:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 code:
   *                                   type: string
   *                                 title:
   *                                   type: string
   *                                   nullable: true
   *             examples:
   *               example:
   *                 summary: Ranked occupations filtered by industry
   *                 value:
   *                   total_selected: 3
   *                   industry: "Information Media and Telecommunications"
   *                   limit: 10
   *                   items:
   *                     - occupation_code: "15-2031.00"
   *                       occupation_title: "Operations Research Analysts"
   *                       score: 3.3
   *                       count: 3
   *                       anzsco:
   *                         - code: "261313"
   *                           title: "Software Engineer"
   *                           description: "Designs, develops..."
   *                       unmatched:
   *                         knowledge: []
   *                         skill: []
   *                         tech: []
   *
   *       '400':
   *         description: Invalid or missing body.
   *         x-description-zh: 请求体不合法或缺少能力代码。
   *       '500':
   *         description: Server error.
   *         x-description-zh: 服务器内部错误。
   */
  
  router.post('/occupations/rank-by-codes', async (req, res) => {
    // 1) Read and clean selections
    let selections = ensureArray(req.body?.selections)
      .map(x => ({ type: String(x.type || '').toLowerCase(), code: String(x.code || '').trim() }))
      .filter(x => x.type && x.code && ['knowledge', 'skill', 'tech'].includes(x.type));

    if (selections.length === 0) {
      return res.status(400).json({ error: 'no codes provided' });
    }

    // 2) Classification Summary
    const selKn = new Set(selections.filter(x => x.type === 'knowledge').map(x => x.code));
    const selSk = new Set(selections.filter(x => x.type === 'skill').map(x => x.code));
    const selTe = new Set(selections.filter(x => x.type === 'tech').map(x => x.code));

    // Industry and restrictions
    const qInd = (req.query?.industry ?? '').toString().trim();
    const bInd = (req.body?.industry ?? '').toString().trim();
    const industry = qInd || bInd;
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? '10', 10) || 10, 1), 50);

    // Cache key (by industry dimension + selections)
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const scope = industry ? norm(industry) : 'all';
    const selHash = stableHashSelections(selections);
    const cacheKey = `sbridg:cache:v1:soc:rank:industry:${scope}:${selHash}`;
    const bypass = req.query?.refresh === '1';

    if (!bypass) {
      const hit = await json.get(cacheKey);
      if (hit) return res.json({ cached: true, ...hit });
    }

    const conn = await pool.getConnection();
    try {
      // 3) Code -> Title Mapping (used when displaying unmatched)
      const titleMap = async (table, codeField, titleField, set) => {
        if (!set.size) return new Map();
        const codes = [...set];
        const [rows] = await conn.query(
          `SELECT ${codeField} AS code, ${titleField} AS title
           FROM ${table}
           WHERE ${codeField} IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        return new Map(rows.map(r => [r.code, strip(r.title)]));
      };

      const knTitleMap = await titleMap('knowledge_data', 'knowledge_code', 'knowledge_title', selKn);
      const skTitleMap = await titleMap('skill_data', 'skill_code', 'skill_title', selSk);
      const teTitleMap = await titleMap('technology_skill_data', 'tech_skill_code', 'tech_title', selTe);

      // 4) Reverse check of occupation hits
      const results = [];
      const fetchAndPush = async (table, field, type, set) => {
        if (!set.size) return;
        const codes = [...set];
        const [rows] = await conn.query(
          `SELECT o.occupation_code, o.occupation_title, t.${field} AS code, ? AS type
           FROM ${table} t
           JOIN occupation_data o ON o.occupation_code = t.occupation_code
          WHERE t.${field} IN (${codes.map(() => '?').join(',')})`,
          [type, ...codes]
        );
        results.push(...rows);
      };

      await fetchAndPush('occup_know_data', 'knowledge_code', 'knowledge', selKn);
      await fetchAndPush('occup_skill_data', 'skill_code', 'skill', selSk);
      await fetchAndPush('occup_tech_data', 'tech_skill_code', 'tech', selTe);

      // 5) Aggregate and calculate scores
      const byOcc = new Map();
      for (const r of results) {
        const e = byOcc.get(r.occupation_code) || {
          occupation_code: r.occupation_code,
          occupation_title: strip(r.occupation_title),
          matched: { knowledge_codes: new Set(), skill_codes: new Set(), tech_codes: new Set() }
        };
        e.matched[`${r.type}_codes`].add(r.code);
        byOcc.set(r.occupation_code, e);
      }

      const items = [...byOcc.values()].map(e => {
        const kc = e.matched.knowledge_codes.size;
        const sc = e.matched.skill_codes.size;
        const tc = e.matched.tech_codes.size;
        const matchedCats = (kc > 0) + (sc > 0) + (tc > 0); 
        const score = kc + sc + tc + matchedCats * 0.1;
        const unmatched = {
          knowledge: [...selKn].filter(c => !e.matched.knowledge_codes.has(c)).map(c => ({ code: c, title: knTitleMap.get(c) ?? null })),
          skill:     [...selSk].filter(c => !e.matched.skill_codes.has(c)).map(c => ({ code: c, title: skTitleMap.get(c) ?? null })),
          tech:      [...selTe].filter(c => !e.matched.tech_codes.has(c)).map(c => ({ code: c, title: teTitleMap.get(c) ?? null }))
        };
        return {
          occupation_code: e.occupation_code,
          occupation_title: e.occupation_title,
          score,
          count: kc + sc + tc,
          unmatched
        };
      });

      // 6) Sorting (score DESC -> title ASC)
      items.sort((a, b) => b.score - a.score || a.occupation_title.localeCompare(b.occupation_title));

      // 7) SOC -> ANZSCO + Industry Filters
      const occCodes = items.map(i => i.occupation_code);
      let occToAnzscoFull = new Map();

      if (occCodes.length) {
        const placeholders = occCodes.map(() => '?').join(',');
        const [rows] = await conn.query(
          `
          SELECT DISTINCT
                 os.occupation_code,
                 oa.anzsco_code        AS code,
                 ad.anzsco_title       AS title,
                 ad.anzsco_description AS description,
                 i.industry_name
            FROM occup_soc_data   AS os
            JOIN soc_isco_data    AS si ON si.usa_soc_code = os.usa_soc_code
            JOIN isco_osca_data   AS io ON io.isco_code     = si.isco_code
            JOIN osca_anzsco_data AS oa ON oa.osca_code     = io.osca_code
            LEFT JOIN anzsco_data AS ad ON ad.anzsco_code   = oa.anzsco_code
            LEFT JOIN anzsco_industry_map m ON m.anzsco_code = ad.anzsco_code
            LEFT JOIN industry_dim        i ON i.industry_id = m.industry_id
           WHERE os.occupation_code IN (${placeholders})
             AND (? = '' OR (i.industry_name IS NOT NULL AND LOWER(i.industry_name) LIKE CONCAT('%', LOWER(?), '%')))
          `,
          [...occCodes, industry, industry]
        );

        occToAnzscoFull = rows.reduce((m, r) => {
          const k = r.occupation_code;
          const arr = m.get(k) || [];
          arr.push({
            code: String(r.code),
            title: r.title ? strip(r.title) : null,
            description: r.description ? strip(r.description) : null
          });
          m.set(k, arr);
          return m;
        }, new Map());
      }

      // 8)Assemble & return only the first N items
      const finalItems = items
        .map(it => ({
          occupation_code: it.occupation_code,
          occupation_title: it.occupation_title,
          score: it.score,
          count: it.count,
          unmatched: it.unmatched,
          anzsco: occToAnzscoFull.get(it.occupation_code) || []
        }))
        .filter(it => it.anzsco.length > 0)
        .slice(0, limit);

      const response = { total_selected: selections.length, industry: industry || null, limit, items: finalItems };

      // Write cache: 18 hours with results, 2 minutes without results
      try {
        await json.set(cacheKey, response, finalItems.length ? 60 * 60 * 18 : 120);
      } catch (e) {
        console.warn('[cache] set failed:', e?.message || e);
      }

      res.json({ cached: false, ...response });
    } catch (e) {
      console.error('rank-by-codes error:', e);
      res.status(500).json({ error: 'server error' });
    } finally {
      conn.release();
    }
  });

  return router;
}
