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
// 1) 搜索职位 + 返回三类 title（用于前端展示勾选）
// -----------------------------
app.get('/occupations/search-and-titles', async (req, res) => {
  const s = (req.query.s || '').trim();
  if (s.length < 2) return res.status(400).json({ error: 'query too short (>=2)' });

  const conn = await pool.getConnection();
  try {
    const [occs] = await conn.query(
      `
      SELECT o.occupation_code, o.occupation_title, o.occupation_description
        FROM occupation_data o
       WHERE LOWER(o.occupation_title) LIKE LOWER(CONCAT('%', ?, '%'))
          OR EXISTS (SELECT 1 FROM alternative_titles_data a
                      WHERE a.occupation_code = o.occupation_code
                        AND LOWER(a.alternate_title) LIKE LOWER(CONCAT('%', ?, '%')))
          OR EXISTS (SELECT 1 FROM reported_title_data r
                      WHERE r.occupation_code = o.occupation_code
                        AND LOWER(r.report_job_title) LIKE LOWER(CONCAT('%', ?, '%')))
       LIMIT 10
      `,
      [s, s, s]
    );

    const out = [];
    for (const occ of occs) {
      const code = occ.occupation_code;

      const [kn] = await conn.query(
        `SELECT k.knowledge_code AS code, k.knowledge_title AS title
           FROM occup_know_data ok
           JOIN knowledge_data k ON k.knowledge_code = ok.knowledge_code
          WHERE ok.occupation_code = ?`,
        [code]
      );
      const [sk] = await conn.query(
        `SELECT s.skill_code AS code, s.skill_title AS title
           FROM occup_skill_data os
           JOIN skill_data s ON s.skill_code = os.skill_code
          WHERE os.occupation_code = ?`,
        [code]
      );
      const [tech] = await conn.query(
        `SELECT t.tech_skill_code AS code, t.tech_title AS title
           FROM occup_tech_data ot
           JOIN technology_skill_data t ON t.tech_skill_code = ot.tech_skill_code
          WHERE ot.occupation_code = ?`,
        [code]
      );

      out.push({
        occupation_code: code,
        occupation_title: occ.occupation_title,
        knowledge_titles: kn.map((x) => ({ code: x.code, title: strip(x.title) })),
        skill_titles:     sk.map((x) => ({ code: x.code, title: strip(x.title) })),
        tech_titles:     tech.map((x) => ({ code: x.code, title: strip(x.title) })),
      });
    }

    res.json({ items: out });
  } catch (e) {
    console.error('search-and-titles error:', e);
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
// 4) 新增：基于“code”反向聚合到职业，按命中次数排序
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
app.post('/occupations/rank-by-codes', async (req, res) => {
  // 解析两种入参
  let selections = ensureArray(req.body?.selections)
    .map(x => ({ type: norm(x.type), code: (x.code ?? '').trim() }))
    .filter(x => x.type && x.code && ['knowledge','skill','tech'].includes(x.type));

  const kn2 = ensureArray(req.body?.knowledge_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'knowledge', code }));
  const sk2 = ensureArray(req.body?.skill_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'skill', code }));
  const te2 = ensureArray(req.body?.tech_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'tech', code }));

  selections = selections.concat(kn2, sk2, te2);

  // 去重 + 限制最多 10 个
  const seen = new Set();
  const uniq = [];
  for (const s of selections) {
    const k = `${s.type}|${s.code}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(s);
    if (uniq.length >= 10) break;
  }
  selections = uniq;

  if (selections.length === 0) {
    return res.status(400).json({ error: 'no codes provided' });
  }

  const conn = await pool.getConnection();
  try {
    // 按类型拆分 code 数组
    const knCodes = selections.filter(x => x.type === 'knowledge').map(x => x.code);
    const skCodes = selections.filter(x => x.type === 'skill').map(x => x.code);
    const teCodes = selections.filter(x => x.type === 'tech').map(x => x.code);

    const results = [];

    if (knCodes.length) {
      const [rows] = await conn.query(
        `SELECT ok.occupation_code, o.occupation_title, ok.knowledge_code AS code, 'knowledge' AS type
           FROM occup_know_data ok
           JOIN occupation_data o ON o.occupation_code = ok.occupation_code
          WHERE ok.knowledge_code IN (${knCodes.map(() => '?').join(',')})`,
        knCodes
      );
      results.push(...rows);
    }

    if (skCodes.length) {
      const [rows] = await conn.query(
        `SELECT os.occupation_code, o.occupation_title, os.skill_code AS code, 'skill' AS type
           FROM occup_skill_data os
           JOIN occupation_data o ON o.occupation_code = os.occupation_code
          WHERE os.skill_code IN (${skCodes.map(() => '?').join(',')})`,
        skCodes
      );
      results.push(...rows);
    }

    if (teCodes.length) {
      const [rows] = await conn.query(
        `SELECT ot.occupation_code, o.occupation_title, ot.tech_skill_code AS code, 'tech' AS type
           FROM occup_tech_data ot
           JOIN occupation_data o ON o.occupation_code = ot.occupation_code
          WHERE ot.tech_skill_code IN (${teCodes.map(() => '?').join(',')})`,
        teCodes
      );
      results.push(...rows);
    }

    // 聚合到职业：count = 命中 code 的数量（同一职业同一 code 只计 1）
    const byOcc = new Map();
    for (const r of results) {
      const key = r.occupation_code;
      const entry = byOcc.get(key) || {
        occupation_code: r.occupation_code,
        occupation_title: strip(r.occupation_title),
        count: 0,
        matched: { knowledge_codes: new Set(), skill_codes: new Set(), tech_codes: new Set() }
      };
      if (r.type === 'knowledge') entry.matched.knowledge_codes.add(r.code);
      if (r.type === 'skill')     entry.matched.skill_codes.add(r.code);
      if (r.type === 'tech')      entry.matched.tech_codes.add(r.code);
      byOcc.set(key, entry);
    }

    // 计算最终 count（就是三个集合大小之和）
    const items = [...byOcc.values()].map(e => {
      const kc = e.matched.knowledge_codes.size;
      const sc = e.matched.skill_codes.size;
      const tc = e.matched.tech_codes.size;
      return {
        occupation_code: e.occupation_code,
        occupation_title: e.occupation_title,
        count: kc + sc + tc,
        matched: {
          knowledge_codes: [...e.matched.knowledge_codes],
          skill_codes:     [...e.matched.skill_codes],
          tech_codes:      [...e.matched.tech_codes],
        }
      };
    }).sort((a, b) => b.count - a.count || a.occupation_title.localeCompare(b.occupation_title));

    res.json({ total_selected: selections.length, items });
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
