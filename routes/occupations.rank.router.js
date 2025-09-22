// occupations.rank.router.js
import express from 'express';

/**
 * 抽离版：/occupations/rank-by-codes
 * - 保持你原有匹配/计数/排序逻辑不变
 * - 仅新增：
 *   1) 读取可选的前端参数 major_first ('1'..'8')
 *   2) 结果生成后做 SOC -> ANZSCO 的映射，并把映射到的 anzsco_codes 附在每条 item 上
 *   3) 如果传了 major_first，仅保留首位为该数字的 ANZSCO 代码；并过滤掉没有匹配代码的职业
 */

export default function initRankRoutes(pool) {
    const router = express.Router();

    // ===== 本文件内使用的两个小工具，避免改动 index.js =====
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
   *           Optional ANZSCO major group first digit (1..8) for filtering mapped ANZSCO codes.
   *           If provided, only occupations that map to at least one ANZSCO code starting with this digit are kept.
   *         x-description-zh: |-
   *           可选的 ANZSCO 首位行业（1..8）。如提供，仅保留可映射到该首位开头 ANZSCO 代码的职业。
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
   *                   Explicit ability selections as objects with two fields: type and code.
   *                   Use this when you prefer a single structured list.
   *                 x-description-zh: |-
   *                   以对象形式提交的能力选择；每项包含 type 与 code。适合统一提交方式。
   *                 items:
   *                   type: object
   *                   required: [type, code]
   *                   properties:
   *                     type:
   *                       type: string
   *                       enum: [knowledge, skill, tech]
   *                     code:
   *                       type: string
   *               knowledge_codes:
   *                 type: array
   *                 description: Knowledge codes as strings; alternative to the selections array.
   *                 x-description-zh: 知识代码字符串数组；可替代 selections 的写法。
   *                 items: { type: string }
   *               skill_codes:
   *                 type: array
   *                 description: Skill codes as strings; alternative to the selections array.
   *                 x-description-zh: 技能代码字符串数组；可替代 selections 的写法。
   *                 items: { type: string }
   *               tech_codes:
   *                 type: array
   *                 description: Tech or tool codes as strings; alternative to the selections array.
   *                 x-description-zh: 技术或工具代码字符串数组；可替代 selections 的写法。
   *                 items: { type: string }
   *               major_first:
   *                 type: string
   *                 enum: ["1","2","3","4","5","6","7","8"]
   *                 description: |-
   *                   Same as the query parameter major_first; if both are provided, either is accepted.
   *                   When present, each result item includes only ANZSCO codes that start with this digit,
   *                   and items without any matching ANZSCO code are dropped.
   *                 x-description-zh: |-
   *                   与 query 中的 major_first 一致；二者任选其一。提供后，返回的每条记录仅包含以该数字开头的 ANZSCO 代码，
   *                   且没有匹配代码的职业会被过滤掉。
   *           examples:
   *             structured:
   *               summary: Structured selections with major_first
   *               value:
   *                 selections:
   *                   - { "type": "knowledge", "code": "2.C.1.a" }
   *                   - { "type": "skill", "code": "2.A.1.a" }
   *                   - { "type": "skill", "code": "2.A.1.b" }
   *                   - { "type": "skill", "code": "2.A.1.c" }
   *                   - { "type": "skill", "code": "2.A.1.d" }
   *                   - { "type": "skill", "code": "2.A.1.e" }
   *                   - { "type": "skill", "code": "2.A.1.f" }
   *                   - { "type": "skill", "code": "2.A.2.a" }
   *                   - { "type": "skill", "code": "2.A.2.b" }
   *                   - { "type": "skill", "code": "2.A.2.c" }
   *                   - { "type": "skill", "code": "2.A.2.d" }
   *                   - { "type": "skill", "code": "2.B.1.a" }
   *                   - { "type": "skill", "code": "2.B.1.b" }
   *                   - { "type": "skill", "code": "2.B.1.c" }
   *                   - { "type": "skill", "code": "2.B.1.d" }
   *                   - { "type": "skill", "code": "2.B.1.e" }
   *                   - { "type": "skill", "code": "2.B.1.f" }
   *                   - { "type": "skill", "code": "2.B.2.i" }
   *                   - { "type": "skill", "code": "2.B.3.a" }
   *                   - { "type": "skill", "code": "2.B.3.b" }
   *                   - { "type": "skill", "code": "2.B.3.c" }
   *                   - { "type": "tech",  "code": "43231507" }
   *                   - { "type": "tech",  "code": "43232110" }
   *                 major_first: "2"
   *             arrays:
   *               summary: Separate arrays input
   *               value:
   *                 knowledge_codes: ["2.C.1.a","2.C.3.d"]
   *                 skill_codes:     ["2.A.1.e"]
   *                 tech_codes:      ["43233208","43239999"]
   *
   *     responses:
   *       '200':
   *         description: Ranked occupations with unmatched codes by category. Mapped ANZSCO codes are included per item.
   *         x-description-zh: 已排序职业列表，含各类未命中代码；每条结果附带映射到的 ANZSCO 代码。
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
   *                       anzsco_codes:
   *                         type: array
   *                         description: |-
   *                           Distinct ANZSCO codes mapped from this SOC occupation.
   *                           If major_first was provided, only codes starting with that digit are included.
   *                         x-description-zh: |-
   *                           由该 SOC 映射得到的 ANZSCO 代码去重集合；如传入 major_first，则仅保留以该数字开头的代码。
   *                         items: { type: string, example: "261313" }
   *                       unmatched:
   *                         type: object
   *                         properties:
   *                           knowledge:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 code:  { type: string }
   *                                 title: { type: string, nullable: true }
   *                           skill:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 code:  { type: string }
   *                                 title: { type: string, nullable: true }
   *                           tech:
   *                             type: array
   *                             items:
   *                               type: object
   *                               properties:
   *                                 code:  { type: string }
   *                                 title: { type: string, nullable: true }
   *             examples:
   *               sample-en:
   *                 summary: Example (with filtered ANZSCO codes)
   *                 value:
   *                   total_selected: 3
   *                   items:
   *                     - occupation_code: "15-2031.00"
   *                       occupation_title: "Operations Research Analysts"
   *                       count: 3
   *                       anzsco_codes: ["261313","233311"]
   *                       unmatched:
   *                         knowledge: []
   *                         skill: []
   *                         tech:
   *                           - { code: "43239999", title: "Some tool" }
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
        // 解析入参（保持不变）
        let selections = ensureArray(req.body?.selections)
            .map(x => ({ type: String(x.type || '').toLowerCase(), code: String(x.code || '').trim() }))
            .filter(x => x.type && x.code && ['knowledge', 'skill', 'tech'].includes(x.type));

        const kn2 = ensureArray(req.body?.knowledge_codes).map(x => ({ type: 'knowledge', code: String(x).trim() }));
        const sk2 = ensureArray(req.body?.skill_codes).map(x => ({ type: 'skill', code: String(x).trim() }));
        const te2 = ensureArray(req.body?.tech_codes).map(x => ({ type: 'tech', code: String(x).trim() }));
        selections = selections.concat(kn2, sk2, te2);

        // 去重（保持不变）
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

        // 选中全集（保持不变）
        const selKn = new Set(selections.filter(x => x.type === 'knowledge').map(x => x.code));
        const selSk = new Set(selections.filter(x => x.type === 'skill').map(x => x.code));
        const selTe = new Set(selections.filter(x => x.type === 'tech').map(x => x.code));

        // ======【新增 1】读取可选的 ANZSCO 首位（1..8）======
        // query wins; fallback to body
        const qMajor = (req.query?.major_first ?? '').toString().trim();
        const bMajor = (req.body?.major_first ?? '').toString().trim();
        const majorFirstRaw = qMajor || bMajor;
        const majorFirst = /^[1-8]$/.test(majorFirstRaw) ? majorFirstRaw : null;


        const conn = await pool.getConnection();
        try {
            // 先把“选中 code → 标题”做映射（保持不变）
            const knTitleMap = new Map(), skTitleMap = new Map(), teTitleMap = new Map();

            if (selKn.size) {
                const codes = [...selKn];
                const [rows] = await conn.query(
                    `SELECT knowledge_code, knowledge_title FROM knowledge_data
           WHERE knowledge_code IN (${codes.map(() => '?').join(',')})`, codes);
                rows.forEach(r => knTitleMap.set(r.knowledge_code, strip(r.knowledge_title)));
            }
            if (selSk.size) {
                const codes = [...selSk];
                const [rows] = await conn.query(
                    `SELECT skill_code, skill_title FROM skill_data
           WHERE skill_code IN (${codes.map(() => '?').join(',')})`, codes);
                rows.forEach(r => skTitleMap.set(r.skill_code, strip(r.skill_title)));
            }
            if (selTe.size) {
                const codes = [...selTe];
                const [rows] = await conn.query(
                    `SELECT tech_skill_code, tech_title FROM technology_skill_data
           WHERE tech_skill_code IN (${codes.map(() => '?').join(',')})`, codes);
                rows.forEach(r => teTitleMap.set(r.tech_skill_code, strip(r.tech_title)));
            }

            // 命中职业聚合（保持不变）
            const results = [];
            if (selKn.size) {
                const codes = [...selKn];
                const [rows] = await conn.query(
                    `SELECT ok.occupation_code, o.occupation_title, ok.knowledge_code AS code, 'knowledge' AS type
             FROM occup_know_data ok
             JOIN occupation_data o ON o.occupation_code = ok.occupation_code
            WHERE ok.knowledge_code IN (${codes.map(() => '?').join(',')})`, codes);
                results.push(...rows);
            }
            if (selSk.size) {
                const codes = [...selSk];
                const [rows] = await conn.query(
                    `SELECT os.occupation_code, o.occupation_title, os.skill_code AS code, 'skill' AS type
             FROM occup_skill_data os
             JOIN occupation_data o ON o.occupation_code = os.occupation_code
            WHERE os.skill_code IN (${codes.map(() => '?').join(',')})`, codes);
                results.push(...rows);
            }
            if (selTe.size) {
                const codes = [...selTe];
                const [rows] = await conn.query(
                    `SELECT ot.occupation_code, o.occupation_title, ot.tech_skill_code AS code, 'tech' AS type
             FROM occup_tech_data ot
             JOIN occupation_data o ON o.occupation_code = ot.occupation_code
            WHERE ot.tech_skill_code IN (${codes.map(() => '?').join(',')})`, codes);
                results.push(...rows);
            }

            // 以职业为键做聚合（保持不变）
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

            // 生成结果（保持不变）
            const items = [...byOcc.values()].map(e => {
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
                    unmatched: {
                        knowledge: unmatched_kn,
                        skill: unmatched_sk,
                        tech: unmatched_te
                    }
                };
            }).sort((a, b) => b.count - a.count || a.occupation_title.localeCompare(b.occupation_title));

            // ======【新增 2】SOC -> ANZSCO 映射，并把代码挂到每条记录 ======
            const occCodesAll = items.map(it => it.occupation_code);
            let occToAnzsco = new Map();

            if (occCodesAll.length) {
                const placeholders = occCodesAll.map(() => '?').join(',');
                // occup_soc_data -> soc_isco_data -> isco_osca_data -> osca_anzsco_data
                const [mapRows] = await conn.query(
                    `
          SELECT DISTINCT os.occupation_code, oa.anzsco_code
          FROM occup_soc_data     AS os
          JOIN soc_isco_data      AS si ON si.usa_soc_code = os.usa_soc_code
          JOIN isco_osca_data     AS io ON io.isco_code     = si.isco_code
          JOIN osca_anzsco_data   AS oa ON oa.osca_code     = io.osca_code
          WHERE os.occupation_code IN (${placeholders})
          `,
                    occCodesAll
                );

                occToAnzsco = mapRows.reduce((m, r) => {
                    const k = r.occupation_code;
                    const arr = m.get(k) || [];
                    arr.push(String(r.anzsco_code));
                    m.set(k, arr);
                    return m;
                }, new Map());
            }

            // ======【新增 3】根据 major_first 过滤并回填 anzsco_codes ======
            const itemsWithAnzsco = items.map(it => {
                const allCodes = occToAnzsco.get(it.occupation_code) || [];
                const filtered = majorFirst
                    ? allCodes.filter(c => c && c.startsWith(majorFirst))
                    : allCodes;
                return { ...it, anzsco_codes: filtered };
            });

            const finalItems = majorFirst
                ? itemsWithAnzsco.filter(it => it.anzsco_codes.length > 0)
                : itemsWithAnzsco;

            // 返回（保持原字段 + 新增 anzsco_codes）
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
