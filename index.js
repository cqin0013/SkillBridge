// index.js
// SkillBridge API
// Endpoints:
// - GET  /health
// - GET  /occupations/search-and-titles?s=keyword
// - GET  /occupations/:code/titles
// - POST /occupations/match-top           { occupation_code, titles:[{type,title}] }  (基于标题匹配，已上线使用)
// - POST /occupations/rank-by-codes       { selections:[{type,code}], ... }           (本次新增：基于 code 反向聚合到职业)

// -----------------------------
// Setup
// -----------------------------
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const {
  PORT = 8080,
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_NAME = 'skillbridge',
} = process.env;

console.log('DB config:', { DB_HOST, DB_USER, DB_NAME });

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

// -----------------------------
// Helpers
// -----------------------------
const norm = (s) => (s ?? '').replace(/[\r\n]/g, '').trim().toLowerCase();
const strip = (s) => (s ?? '').replace(/[\r\n]/g, '');
const ensureArray = (a) => (Array.isArray(a) ? a : []);

// -----------------------------
// Health check
// -----------------------------
app.get('/health', async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});


// -----------------------------
// 1) 搜索职位（只返回最相似的职业，不带三类标题）
//    GET /occupations/search-and-titles?s=keyword&limit=10&includeScore=0

    // 说明：
    // - WHERE 先做“任意包含”范围过滤（职业标题/别名/报岗名 三处任一匹配即可）
    // - ORDER BY 做“相关性打分排序”，优先级从高到低：
    //   1) 职业标题完全相等
    //   2) 职业标题前缀匹配
    //   3) 职业标题单词边界匹配（中间有空格）
    //   4) 职业标题任意位置包含
    //   5) 备用标题/报告标题的 等于/前缀/包含（依次降低）
    //   同分时按 occupation_title 升序
// -----------------------------
// 1) 搜索职位（只返回职业基本信息；支持 includeAliases 开关；不返回分数）
app.get('/occupations/search-and-titles', async (req, res) => {
  const s = (req.query.s || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '10', 10) || 10, 1), 20); // 1..20
  const includeAliases = String(req.query.includeAliases || '1') === '1'; // 1=包含别名/报岗名

  if (s.length < 2) return res.status(400).json({ error: 'query too short (>=2)' });

  const conn = await pool.getConnection();
  try {
    // 排序表达式（只用于 ORDER BY，不输出给前端）
    let scoreExpr = `
      (LOWER(o.occupation_title) = LOWER(?)) * 100 +
      (LOWER(o.occupation_title) LIKE LOWER(CONCAT(?, '%'))) * 90 +
      (LOWER(o.occupation_title) LIKE LOWER(CONCAT('% ', ?, '%'))) * 85 +
      (LOWER(o.occupation_title) LIKE LOWER(CONCAT('%', ?, '%'))) * 80
    `;
    const scoreParams = [s, s, s, s];

    // 过滤条件：至少主标题模糊匹配
    let where = `LOWER(o.occupation_title) LIKE LOWER(CONCAT('%', ?, '%'))`;
    const whereParams = [s];

    // 可选：把别名/报岗名纳入过滤与排序
    if (includeAliases) {
      scoreExpr += `
        + EXISTS(SELECT 1 FROM alternative_titles_data a
                  WHERE a.occupation_code = o.occupation_code
                    AND LOWER(a.alternate_title) = LOWER(?)) * 60
        + EXISTS(SELECT 1 FROM alternative_titles_data a
                  WHERE a.occupation_code = o.occupation_code
                    AND LOWER(a.alternate_title) LIKE LOWER(CONCAT(?, '%'))) * 55
        + EXISTS(SELECT 1 FROM alternative_titles_data a
                  WHERE a.occupation_code = o.occupation_code
                    AND LOWER(a.alternate_title) LIKE LOWER(CONCAT('%', ?, '%'))) * 50
        + EXISTS(SELECT 1 FROM reported_title_data r
                  WHERE r.occupation_code = o.occupation_code
                    AND LOWER(r.report_job_title) = LOWER(?)) * 40
        + EXISTS(SELECT 1 FROM reported_title_data r
                  WHERE r.occupation_code = o.occupation_code
                    AND LOWER(r.report_job_title) LIKE LOWER(CONCAT(?, '%'))) * 35
        + EXISTS(SELECT 1 FROM reported_title_data r
                  WHERE r.occupation_code = o.occupation_code
                    AND LOWER(r.report_job_title) LIKE LOWER(CONCAT('%', ?, '%'))) * 30
      `;
      scoreParams.push(s, s, s, s, s, s);

      where += `
        OR EXISTS (SELECT 1 FROM alternative_titles_data a
                    WHERE a.occupation_code = o.occupation_code
                      AND LOWER(a.alternate_title) LIKE LOWER(CONCAT('%', ?, '%')))
        OR EXISTS (SELECT 1 FROM reported_title_data r
                    WHERE r.occupation_code = o.occupation_code
                      AND LOWER(r.report_job_title) LIKE LOWER(CONCAT('%', ?, '%')))
      `;
      whereParams.push(s, s);
    }

    const sql = `
      SELECT
        o.occupation_code,
        o.occupation_title,
        o.occupation_description
      FROM occupation_data o
      WHERE ${where}
      ORDER BY ${scoreExpr} DESC, o.occupation_title ASC
      LIMIT ?
    `;

    const params = [...scoreParams, ...whereParams, limit];
    const [rows] = await conn.query(sql, params);

    const items = rows.map(r => ({
      occupation_code: r.occupation_code,
      occupation_title: (r.occupation_title || '').replace(/[\r\n]/g, ''),
      occupation_description: (r.occupation_description || '').replace(/[\r\n]/g, '')
    }));

    res.json({ items });
  } catch (e) {
    console.error('search route error:', e);
    res.status(500).json({ error: 'server error' });
  } finally {
    conn.release();
  }
});



// -----------------------------
// 2) 按 occupation_code 返回三类 title（直接按 code 查）
// -----------------------------
app.get('/occupations/:code/titles', async (req, res) => {
  const occ = (req.params.code || '').trim();
  if (!occ) return res.status(400).json({ error: 'occupation_code required' });

  const conn = await pool.getConnection();
  try {
    const [meta] = await conn.query(
      `SELECT occupation_code, occupation_title, occupation_description
         FROM occupation_data WHERE occupation_code = ?`,
      [occ]
    );
    if (meta.length === 0) return res.status(404).json({ error: 'occupation not found' });

    const [kn] = await conn.query(
      `SELECT k.knowledge_code AS code, k.knowledge_title AS title
         FROM occup_know_data ok
         JOIN knowledge_data k ON k.knowledge_code = ok.knowledge_code
        WHERE ok.occupation_code = ?
        ORDER BY k.knowledge_title`,
      [occ]
    );
    const [sk] = await conn.query(
      `SELECT s.skill_code AS code, s.skill_title AS title
         FROM occup_skill_data os
         JOIN skill_data s ON s.skill_code = os.skill_code
        WHERE os.occupation_code = ?
        ORDER BY s.skill_title`,
      [occ]
    );
    const [tech] = await conn.query(
      `SELECT t.tech_skill_code AS code, t.tech_title AS title
         FROM occup_tech_data ot
         JOIN technology_skill_data t ON t.tech_skill_code = ot.tech_skill_code
        WHERE ot.occupation_code = ?
        ORDER BY t.tech_title`,
      [occ]
    );

    res.json({
      occupation: meta[0],
      knowledge_titles: kn.map(x => ({ code: x.code, title: strip(x.title) })),
      skill_titles:     sk.map(x => ({ code: x.code, title: strip(x.title) })),
      tech_titles:      tech.map(x => ({ code: x.code, title: strip(x.title) })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server error' });
  } finally {
    conn.release();
  }
});


// -----------------------------
// 3) 基于“标题”匹配（你之前已经在用）
// -----------------------------
app.post('/occupations/match-top', async (req, res) => {
  const occ = req.body?.occupation_code;
  const picksRaw = ensureArray(req.body?.titles).slice(0, 6); // 最多6个
  if (!occ || picksRaw.length === 0) {
    return res.status(400).json({ error: 'occupation_code & titles required' });
  }

  const picks = picksRaw
    .map(t => ({ type: norm(t.type), title: norm(t.title) }))
    .filter(t => t.type && t.title && ['knowledge','skill','tech'].includes(t.type));

  if (!picks.length) return res.json({ items: [] });

  const conn = await pool.getConnection();
  try {
    const [kn] = await conn.query(
      `SELECT 'knowledge' AS type, k.knowledge_code AS code, k.knowledge_title AS raw_title
         FROM occup_know_data ok
         JOIN knowledge_data k ON k.knowledge_code = ok.knowledge_code
        WHERE ok.occupation_code = ?`,
      [occ]
    );
    const [sk] = await conn.query(
      `SELECT 'skill' AS type, s.skill_code AS code, s.skill_title AS raw_title
         FROM occup_skill_data os
         JOIN skill_data s ON s.skill_code = os.skill_code
        WHERE os.occupation_code = ?`,
      [occ]
    );
    const [tech] = await conn.query(
      `SELECT 'tech' AS type, t.tech_skill_code AS code, t.tech_title AS raw_title
         FROM occup_tech_data ot
         JOIN technology_skill_data t ON t.tech_skill_code = ot.tech_skill_code
        WHERE ot.occupation_code = ?`,
      [occ]
    );

    const index = new Map(); // `${type}|${norm(title)}` -> row
    for (const row of [...kn, ...sk, ...tech]) {
      index.set(`${row.type}|${norm(row.raw_title)}`, row);
    }

    const agg = new Map(); // `${type}|${code}` -> {type,code,title,count}
    for (const p of picks) {
      const hit = index.get(`${p.type}|${p.title}`);
      if (!hit) continue;
      const key = `${hit.type}|${hit.code}`;
      const prev = agg.get(key) || { type: hit.type, code: hit.code, title: strip(hit.raw_title), count: 0 };
      prev.count += 1;
      agg.set(key, prev);
    }

    const items = [...agg.values()].sort((a, b) => b.count - a.count);
    res.json({ items });
  } catch (e) {
    console.error('match-top error:', e);
    res.status(500).json({ error: 'server error' });
  } finally {
    conn.release();
  }
});

// -----------------------------
// 4) 新增：基于skillcode反向聚合到职业，按命中次数排序
// -----------------------------
/*
POST /occupations/rank-by-codes
支持两种入参形态（二选一或都给）：
A) { selections: [ { "type":"knowledge"|"skill"|"tech", "code":"..." }, ... ] }
B) {
     knowledge_codes: ["2.C.1.a", ...],
     skill_codes:     ["2.A.1.b", ...],
     tech_codes:      ["43231507", ...]
   }
总勾选数 <= 10（超出会被截断）

响应：
{
  "total_selected": 6,
  "items": [
    {
      "occupation_code": "11-1011.00",
      "occupation_title": "Chief Executives",
      "count": 4,
      "matched": {
        "knowledge_codes": ["2.C.1.a", ...],
        "skill_codes":     ["2.A.1.b", ...],
        "tech_codes":      ["43231507", ...]
      }
    },
    ...
  ]
}
*/
// 4) 基于 code 反向聚合到职业，返回【未命中的 codes+titles】
// 4) 基于 code 反向聚合到职业，返回【未命中的 codes+titles】（无数量上限）
app.post('/occupations/rank-by-codes', async (req, res) => {
  // 解析两种入参
  let selections = ensureArray(req.body?.selections)
    .map(x => ({ type: norm(x.type), code: (x.code ?? '').trim() }))
    .filter(x => x.type && x.code && ['knowledge','skill','tech'].includes(x.type));

  const kn2 = ensureArray(req.body?.knowledge_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'knowledge', code }));
  const sk2 = ensureArray(req.body?.skill_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'skill', code }));
  const te2 = ensureArray(req.body?.tech_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'tech', code }));
  selections = selections.concat(kn2, sk2, te2);

  // 去重（删除了“最多 10 个”的限制）
  const seen = new Set();
  const uniq = [];
  for (const s of selections) {
    const k = `${s.type}|${s.code}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(s);
  }
  selections = uniq;

  if (selections.length === 0) {
    return res.status(400).json({ error: 'no codes provided' });
  }

  // 选中 codes 全集（用于后面求未命中）
  const selKn = new Set(selections.filter(x => x.type === 'knowledge').map(x => x.code));
  const selSk = new Set(selections.filter(x => x.type === 'skill').map(x => x.code));
  const selTe = new Set(selections.filter(x => x.type === 'tech').map(x => x.code));

  const conn = await pool.getConnection();
  try {
    // 一次性把选中 codes 的标题查出来，做映射表
    const knTitleMap = new Map();
    const skTitleMap = new Map();
    const teTitleMap = new Map();

    if (selKn.size) {
      const codes = [...selKn];
      const [rows] = await conn.query(
        `SELECT knowledge_code, knowledge_title FROM knowledge_data
          WHERE knowledge_code IN (${codes.map(()=>'?').join(',')})`,
        codes
      );
      for (const r of rows) knTitleMap.set(r.knowledge_code, strip(r.knowledge_title));
    }
    if (selSk.size) {
      const codes = [...selSk];
      const [rows] = await conn.query(
        `SELECT skill_code, skill_title FROM skill_data
          WHERE skill_code IN (${codes.map(()=>'?').join(',')})`,
        codes
      );
      for (const r of rows) skTitleMap.set(r.skill_code, strip(r.skill_title));
    }
    if (selTe.size) {
      const codes = [...selTe];
      const [rows] = await conn.query(
        `SELECT tech_skill_code, tech_title FROM technology_skill_data
          WHERE tech_skill_code IN (${codes.map(()=>'?').join(',')})`,
        codes
      );
      for (const r of rows) teTitleMap.set(r.tech_skill_code, strip(r.tech_title));
    }

    // 用三张“关系表”查每个 code 对应的职业（命中的）
    const results = [];
    if (selKn.size) {
      const codes = [...selKn];
      const [rows] = await conn.query(
        `SELECT ok.occupation_code, o.occupation_title, ok.knowledge_code AS code, 'knowledge' AS type
           FROM occup_know_data ok
           JOIN occupation_data o ON o.occupation_code = ok.occupation_code
          WHERE ok.knowledge_code IN (${codes.map(()=>'?').join(',')})`,
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
          WHERE os.skill_code IN (${codes.map(()=>'?').join(',')})`,
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
          WHERE ot.tech_skill_code IN (${codes.map(()=>'?').join(',')})`,
        codes
      );
      results.push(...rows);
    }

    // 统计每个职业命中的集合
    const byOcc = new Map();
    for (const r of results) {
      const key = r.occupation_code;
      const entry = byOcc.get(key) || {
        occupation_code: r.occupation_code,
        occupation_title: strip(r.occupation_title),
        matched: { knowledge_codes: new Set(), skill_codes: new Set(), tech_codes: new Set() }
      };
      if (r.type === 'knowledge') entry.matched.knowledge_codes.add(r.code);
      if (r.type === 'skill')     entry.matched.skill_codes.add(r.code);
      if (r.type === 'tech')      entry.matched.tech_codes.add(r.code);
      byOcc.set(key, entry);
    }

    // 生成响应：unmatched 数组包含 {code, title}
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
        count: kc + sc + tc,  // 仍用命中数量排序
        unmatched: {
          knowledge: unmatched_kn,
          skill:     unmatched_sk,
          tech:      unmatched_te
        }
      };
    }).sort((a, b) => b.count - a.count || a.occupation_title.localeCompare(b.occupation_title));

    res.json({
      total_selected: selections.length,
      items
    });
  } catch (e) {
    console.error('rank-by-codes error:', e);
    res.status(500).json({ error: 'server error' });
  } finally {
    conn.release();
  }
});


// -----------------------------
// (可选) 快速验证 occupation_data
// -----------------------------
app.get('/test-occupations', async (_req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT occupation_code, occupation_title FROM occupation_data LIMIT 5'
    );
    conn.release();
    res.json({ items: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'db error' });
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`SkillBridge API listening on http://localhost:${PORT}`);
});
