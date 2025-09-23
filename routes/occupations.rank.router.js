import express from 'express';

export default function initRankRoutes(pool) {
  const router = express.Router();

  // ===== tools =====
  const ensureArray = (a) => (Array.isArray(a) ? a : []);
  const strip = (s) => (s ?? '').replace(/[\r\n]/g, '');
  /**
   * @openapi
   * /occupations/rank-by-codes:
   *   post:
   *     tags: [SOC]
   *     summary: Rank occupations by selected ability codes (knowledge / skill / tech)
   *     description: |-
   *       Reverse-lookup by ability codes, aggregate matches per occupation, and sort
   *       by total hits across knowledge, skill, and tech categories. Also returns
   *       unmatched codes (with titles) per occupation to highlight gaps.
   *     x-summary-zh: 基于能力代码（知识/技能/技术）聚合并排序职业
   *     x-description-zh: |-
   *       以能力代码反向查找职业，按知识、技能与技术三类的命中数汇总并降序排序；同时返回各职业未命中的能力代码及其标题，用于能力缺口展示。
   *
   *     parameters:
   *       - in: query
   *         name: major_first
   *         required: false
   *         schema:
   *           type: string
   *           enum: ["1","2","3","4","5","6","7","8"]
   *         description: |-
   *           Optional ANZSCO major group first digit (1..8) for filtering mapped ANZSCO records.
   *           If provided, only occupations that map to at least one ANZSCO code starting with this digit are kept.
   *         x-description-zh: |-
   *           可选的 ANZSCO 首位（1..8）。如提供，仅保留可映射到该首位开头 ANZSCO 代码的职业。
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
   *                   type ∈ {knowledge, skill, tech}.
   *                 x-description-zh: |-
   *                   以对象形式提交的能力选择；每项包含 type 与 code。type 取值为 knowledge/skill/tech。
   *                 items:
   *                   type: object
   *                   required:
   *                     - type
   *                     - code
   *                   properties:
   *                     type:
   *                       type: string
   *                       enum: [knowledge, skill, tech]
   *                     code:
   *                       type: string
   *               major_first:
   *                 type: string
   *                 enum: ["1","2","3","4","5","6","7","8"]
   *                 description: |-
   *                   Same as the query parameter major_first; if both are provided, either is accepted.
   *                   When present, each result item only includes ANZSCO records whose code starts with this digit,
   *                   and items without any matching ANZSCO record are dropped.
   *                 x-description-zh: |-
   *                   与 query 中的 major_first 一致；二者任选其一。提供后，返回的每条记录仅包含以该数字开头的 ANZSCO 记录，
   *                   且没有匹配记录的职业会被过滤掉。
   *           examples:
   *             structured:
   *               summary: Structured selections with major_first
   *               value:
   *                 selections:
   *                   - { "type": "knowledge", "code": "2.C.1.a" }
   *                   - { "type": "skill",     "code": "2.A.1.a" }
   *                   - { "type": "skill",     "code": "2.A.1.b" }
   *                   - { "type": "skill",     "code": "2.A.1.c" }
   *                   - { "type": "skill",     "code": "2.A.1.d" }
   *                   - { "type": "skill",     "code": "2.A.1.e" }
   *                   - { "type": "skill",     "code": "2.A.1.f" }
   *                   - { "type": "skill",     "code": "2.A.2.a" }
   *                   - { "type": "skill",     "code": "2.A.2.b" }
   *                   - { "type": "skill",     "code": "2.A.2.c" }
   *                   - { "type": "skill",     "code": "2.A.2.d" }
   *                   - { "type": "skill",     "code": "2.B.1.a" }
   *                   - { "type": "skill",     "code": "2.B.1.b" }
   *                   - { "type": "skill",     "code": "2.B.1.c" }
   *                   - { "type": "skill",     "code": "2.B.1.d" }
   *                   - { "type": "skill",     "code": "2.B.1.e" }
   *                   - { "type": "skill",     "code": "2.B.1.f" }
   *                   - { "type": "skill",     "code": "2.B.2.i" }
   *                   - { "type": "skill",     "code": "2.B.3.a" }
   *                   - { "type": "skill",     "code": "2.B.3.b" }
   *                   - { "type": "skill",     "code": "2.B.3.c" }
   *                   - { "type": "tech",      "code": "43231507" }
   *                   - { "type": "tech",      "code": "43232110" }
   *                 major_first: "2"
   *
   *     responses:
   *       '200':
   *         description: Ranked occupations with unmatched codes by category. Each item contains mapped ANZSCO records (code/title/description).
   *         x-description-zh: 已排序职业列表，含各类未命中代码；每条结果包含映射到的 ANZSCO 记录（含代码/标题/描述）。
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 total_selected:
   *                   type: integer
   *                   description: Count of unique selected codes across all categories.
   *                   x-description-zh: 去重后的已选能力代码总数。
   *                   example: 3
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
   *                       count:
   *                         type: integer
   *                         description: Total matched count across knowledge, skill, and tech.
   *                         x-description-zh: 三类命中数之和。
   *                         example: 5
   *                       anzsco:
   *                         type: array
   *                         description: |-
   *                           ANZSCO mappings enriched with title & description from `anzsco_data`.
   *                           If major_first is provided, only records whose code starts with that digit are included.
   *                         x-description-zh: |-
   *                           映射到的 ANZSCO 记录，包含标题与描述（来自 `anzsco_data`）。若提供了 major_first，仅包含以该数字开头的记录。
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
   *                               example: "Designs, develops, tests..."
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
   *               sample-en:
   *                 summary: Example (with filtered ANZSCO records)
   *                 value:
   *                   total_selected: 3
   *                   items:
   *                     - occupation_code: "15-2031.00"
   *                       occupation_title: "Operations Research Analysts"
   *                       count: 3
   *                       anzsco:
   *                         - code: "261313"
   *                           title: "Software Engineer"
   *                           description: "Designs, develops..."
   *                         - code: "233311"
   *                           title: "Electrical Engineer"
   *                           description: null
   *                       unmatched:
   *                         knowledge: []
   *                         skill: []
   *                         tech:
   *                           - code: "43239999"
   *                             title: "Some tool"
   *
   *       '400':
   *         description: No codes provided or invalid body.
   *         x-description-zh: 入参缺少能力代码或请求体格式不合法。
   *
   *       '500':
   *         description: Server error.
   *         x-description-zh: 服务器错误。
   */
  router.post('/occupations/rank-by-codes', async (req, res) => {

    let selections = ensureArray(req.body?.selections)
      .map(x => ({ type: String(x.type || '').toLowerCase(), code: String(x.code || '').trim() }))
      .filter(x => x.type && x.code && ['knowledge', 'skill', 'tech'].includes(x.type));

    const kn2 = ensureArray(req.body?.knowledge_codes).map(x => ({ type: 'knowledge', code: String(x).trim() }));
    const sk2 = ensureArray(req.body?.skill_codes).map(x => ({ type: 'skill', code: String(x).trim() }));
    const te2 = ensureArray(req.body?.tech_codes).map(x => ({ type: 'tech', code: String(x).trim() }));
    selections = selections.concat(kn2, sk2, te2);

    // Deduplication
    const seen = new Set();
    selections = selections.filter(s => {
      const k = `${s.type}|${s.code}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (selections.length === 0) {
      return res.status(400).json({ error: 'no codes provided' });
    }


    const selKn = new Set(selections.filter(x => x.type === 'knowledge').map(x => x.code));
    const selSk = new Set(selections.filter(x => x.type === 'skill').map(x => x.code));
    const selTe = new Set(selections.filter(x => x.type === 'tech').map(x => x.code));

    // Read the optional ANZSCO first digit (1..8)
    const qMajor = (req.query?.major_first ?? '').toString().trim();
    const bMajor = (req.body?.major_first ?? '').toString().trim();
    const majorFirstRaw = qMajor || bMajor;
    const majorFirst = /^[1-8]$/.test(majorFirstRaw) ? majorFirstRaw : null;

    const conn = await pool.getConnection();
    try {
      // code -> title
      const knTitleMap = new Map(), skTitleMap = new Map(), teTitleMap = new Map();

      if (selKn.size) {
        const codes = [...selKn];
        const [rows] = await conn.query(
          `SELECT knowledge_code, knowledge_title FROM knowledge_data
           WHERE knowledge_code IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        rows.forEach(r => knTitleMap.set(r.knowledge_code, strip(r.knowledge_title)));
      }
      if (selSk.size) {
        const codes = [...selSk];
        const [rows] = await conn.query(
          `SELECT skill_code, skill_title FROM skill_data
           WHERE skill_code IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        rows.forEach(r => skTitleMap.set(r.skill_code, strip(r.skill_title)));
      }
      if (selTe.size) {
        const codes = [...selTe];
        const [rows] = await conn.query(
          `SELECT tech_skill_code, tech_title FROM technology_skill_data
           WHERE tech_skill_code IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        rows.forEach(r => teTitleMap.set(r.tech_skill_code, strip(r.tech_title)));
      }

      // Hit Profession Aggregation
      const results = [];
      if (selKn.size) {
        const codes = [...selKn];
        const [rows] = await conn.query(
          `SELECT ok.occupation_code, o.occupation_title, ok.knowledge_code AS code, 'knowledge' AS type
             FROM occup_know_data ok
             JOIN occupation_data o ON o.occupation_code = ok.occupation_code
            WHERE ok.knowledge_code IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        results.push(...rows);
      }
      if (selSk.size) {
        const codes = [...selSk];
        const [rows] = await conn.query(
          `SELECT os.occupation_code, o.occupation_title, os.skill_code AS code, 'skill' AS type
             FROM occup_skill_data os
             JOIN occupation_data o ON o.occupation_code = os.occupation_code
            WHERE os.skill_code IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        results.push(...rows);
      }
      if (selTe.size) {
        const codes = [...selTe];
        const [rows] = await conn.query(
          `SELECT ot.occupation_code, o.occupation_title, ot.tech_skill_code AS code, 'tech' AS type
             FROM occup_tech_data ot
             JOIN occupation_data o ON o.occupation_code = ot.occupation_code
            WHERE ot.tech_skill_code IN (${codes.map(() => '?').join(',')})`,
          codes
        );
        results.push(...rows);
      }

      // Aggregate by occupation
      const byOcc = new Map();
      for (const r of results) {
        const key = r.occupation_code;
        const entry = byOcc.get(key) || {
          occupation_code: r.occupation_code,
          occupation_title: strip(r.occupation_title),
          matched: { knowledge_codes: new Set(), skill_codes: new Set(), tech_codes: new Set() }
        };
        if (r.type === 'knowledge') entry.matched.knowledge_codes.add(r.code);
        if (r.type === 'skill') entry.matched.skill_codes.add(r.code);
        if (r.type === 'tech') entry.matched.tech_codes.add(r.code);
        byOcc.set(key, entry);
      }

      // Generate results (including miss details)
      const items = [...byOcc.values()]
        .map(e => {
          const kc = e.matched.knowledge_codes.size;
          const sc = e.matched.skill_codes.size;
          const tc = e.matched.tech_codes.size;

          const unmatched_kn = [...selKn]
            .filter(code => !e.matched.knowledge_codes.has(code))
            .map(code => ({ code, title: knTitleMap.get(code) ?? null }));

          const unmatched_sk = [...selSk]
            .filter(code => !e.matched.skill_codes.has(code))
            .map(code => ({ code, title: skTitleMap.get(code) ?? null }));

          const unmatched_te = [...selTe]
            .filter(code => !e.matched.tech_codes.has(code))
            .map(code => ({ code, title: teTitleMap.get(code) ?? null }));

          return {
            occupation_code: e.occupation_code,
            occupation_title: e.occupation_title,
            count: kc + sc + tc,
            unmatched: { knowledge: unmatched_kn, skill: unmatched_sk, tech: unmatched_te }
          };
        })
        .sort((a, b) => b.count - a.count || a.occupation_title.localeCompare(b.occupation_title));

      // ====== SOC -> ANZSCO
      const occCodesAll = items.map(it => it.occupation_code);
      let occToAnzscoFull = new Map(); // Map<occupation_code, Array<{code,title,description}>>

      if (occCodesAll.length) {
        const placeholders = occCodesAll.map(() => '?').join(',');
        const [mapRows] = await conn.query(
          `
          SELECT DISTINCT
            os.occupation_code,
            oa.anzsco_code        AS code,
            ad.anzsco_title       AS title,
            ad.anzsco_description AS description
          FROM occup_soc_data   AS os
          JOIN soc_isco_data    AS si ON si.usa_soc_code = os.usa_soc_code
          JOIN isco_osca_data   AS io ON io.isco_code     = si.isco_code
          JOIN osca_anzsco_data AS oa ON oa.osca_code     = io.osca_code
          LEFT JOIN anzsco_data AS ad ON ad.anzsco_code   = oa.anzsco_code
          WHERE os.occupation_code IN (${placeholders})
          `,
          occCodesAll
        );

        occToAnzscoFull = mapRows.reduce((m, r) => {
          const k = r.occupation_code;
          const arr = m.get(k) || [];
          arr.push({
            code: String(r.code),
            title: r.title != null ? String(r.title) : null,
            description: r.description != null ? String(r.description) : null
          });
          m.set(k, arr);
          return m;
        }, new Map());
      }

      // Filter by major_first and link back to each record
      const itemsWithAnzsco = items.map(it => {
        const allObjs = occToAnzscoFull.get(it.occupation_code) || [];
        const filteredObjs = majorFirst
          ? allObjs.filter(o => o.code && o.code.startsWith(majorFirst))
          : allObjs;
        return { ...it, anzsco: filteredObjs };
      });

      const finalItems = majorFirst
        ? itemsWithAnzsco.filter(it => it.anzsco.length > 0)
        : itemsWithAnzsco;

      // return
      res.json({ total_selected: selections.length, items: finalItems });
    } catch (e) {
      console.error('rank-by-codes error:', e);
      res.status(500).json({ error: 'server error' });
    } finally {
      conn.release();
    }
  });

  return router;
}
