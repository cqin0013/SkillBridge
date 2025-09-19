// index.js
// SkillBridge API
// Endpoints:
// - GET  /health
// - GET  /occupations/search-and-titles?s=keyword
// - GET  /occupations/:code/titles
// - POST /occupations/match-top           { occupation_code, titles:[{type,title}] }  (Title-based matching, already live)
// - POST /occupations/rank-by-codes       { selections:[{type,code}], ... }           (New in this release: reverse aggregation to occupations by code)

// -----------------------------
// Setup
// -----------------------------
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

//import trainingAdviceProxy from './training-advice.proxy.js';


// === New: three security enhancement dependencies ===
import helmet from 'helmet';                     // HTTP security headers & CSP
import session from 'express-session';           // Session & secure cookies
// import RedisStore from 'connect-redis';       // Session persistence (Redis) — legacy default export
// import { RedisStore } from 'connect-redis';   // Alternative import style (commented in original)
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import cookieParser from 'cookie-parser';

import { spawn } from 'child_process';
// import path from 'path';
import { fileURLToPath } from 'url';

import path from 'node:path';

// ★ 新增：纯 Node 版训练建议路由（不再使用 Python）
import trainingAdviceRouter from './training-advice.router.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// 在现有路由之前挂载 training-advice
//app.use('/', trainingAdviceProxy);


// Parse body first (keep the original limit as needed)
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ===================== Security Enhancements Begin =====================
// 1) Strict CORS (whitelist-based) with credentials so Cookies/Sessions are sent
//    Requires env: CORS_ALLOWLIST=https://a.example.com,https://b.example.com
app.set('trust proxy', 1); // When running behind Render/reverse proxy, ensure secure cookies work

const allowlist = String(process.env.CORS_ALLOWLIST || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Allow non-browser requests (no Origin) or requests from the allowlist.
    // For stricter policy, remove the `!origin` branch.
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow sending cookies (pairs with session)
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
  maxAge: 600,
}));

// 2) HTTP security headers (Helmet & CSP)
//    Helmet provides common security headers; CSP kept minimal if this is a pure API
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Useful if you offer downloads/cross-origin resources
}));

// Minimal Content-Security-Policy example for an API service
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],
    // Allow fetch/XHR to the API from the allowlisted frontends
    "connect-src": ["'self'"].concat(allowlist),
    "img-src": ["'self'", "data:"],
    "script-src": ["'self'"],             // Disallow third-party scripts; relax only if strictly needed
    "style-src": ["'self'", "'unsafe-inline'"], // Keep 'unsafe-inline' only when absolutely necessary
    "frame-ancestors": ["'none'"],        // Prevent embedding in iframes (clickjacking protection)
  },
}));

// 3) Sessions & secure cookies (Redis persistence)
//    Required env vars:
//      SESSION_SECRET=strong_random_string
//      SESSION_NAME=sbridg.sid (optional)
//      COOKIE_DOMAIN=.your-frontend.com (optional; for sharing across subdomains)
//      REDIS_URL=redis://user:pass@host:6379
//      SESSION_SAMESITE=none|lax|strict (use 'none' for cross-site scenarios)
const sameSiteFromEnv = String(process.env.SESSION_SAMESITE || 'lax').toLowerCase();
const sameSite = ['lax', 'strict', 'none'].includes(sameSiteFromEnv) ? sameSiteFromEnv : 'lax';

// Upstash/Redis Cloud often uses rediss:// (TLS)
// (Original ioredis example kept commented)
// const redis = new Redis(process.env.REDIS_URL, {
//   tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
//   maxRetriesPerRequest: 3,
//   enableReadyCheck: true,
//   keepAlive: 10_000,
//   connectTimeout: 15_000,
// });

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: process.env.REDIS_URL?.startsWith('rediss://') ? true : false,
    keepAlive: 10_000,
    reconnectStrategy: (retries) => Math.min(1000 * retries, 10_000),
  }
});
redis.on('connect', () => console.log('[redis] connecting...'));
redis.on('ready',   () => console.log('[redis] ready'));
redis.on('error',   (e) => console.error('[redis] error:', e?.message || e));
redis.on('end',     () => console.log('[redis] connection closed'));
await redis.connect();

// Additional logs for troubleshooting
redis.on('connect', () => console.log('[redis] connecting...'));
redis.on('ready',   () => console.log('[redis] ready'));
redis.on('error',   (e) => console.error('[redis] error:', e?.message || e));
redis.on('end',     () => console.log('[redis] connection closed'));

const redisStore = new RedisStore({ client: redis, prefix: 'sbridg:' });

app.use(cookieParser(process.env.SESSION_SECRET));

app.use(session({
  name: process.env.SESSION_NAME || 'sbridg.sid',
  secret: process.env.SESSION_SECRET,
  store: redisStore,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Refresh session expiration on each request (turn off if you prefer)
  cookie: {
    httpOnly: true,                               // Prevent JS access; mitigates XSS session theft
    secure: process.env.NODE_ENV === 'production',// Enforce HTTPS in production
    sameSite,                                     // Good CSRF balance; set 'none' for cross-site use
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 1000 * 60 * 60 * 8,                   // 8 hours
  },
}));
// ===================== Security Enhancements End =====================

// ★★★ 在 session 之后挂载「纯 Node 版」训练建议路由 ★★★
app.use('/', trainingAdviceRouter);

// ===================== Database Connection =====================
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
// 1) Search occupations (returns only base info; supports includeAliases flag; no score in response)
//    GET /occupations/search-and-titles?s=keyword&limit=10&includeScore=0
//
// Notes:
// - WHERE first performs broad fuzzy filtering (match in any of: occupation title / alternative titles / reported titles)
// - ORDER BY calculates a relevance score with priority:
//   1) Exact equality with occupation title
//   2) Prefix match on occupation title
//   3) Word-boundary match (space before the substring)
//   4) Substring match anywhere in occupation title
//   5) Equality/prefix/contains in alternative/reported titles (decreasing weights)
//   Ties are broken by occupation_title ascending
// -----------------------------
app.get('/occupations/search-and-titles', async (req, res) => {
  const s = (req.query.s || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '10', 10) || 10, 1), 20); // 1..20
  const includeAliases = String(req.query.includeAliases || '1') === '1'; // 1 = include aliases/reported titles

  if (s.length < 2) return res.status(400).json({ error: 'query too short (>=2)' });

  const conn = await pool.getConnection();
  try {
    // Score expression (ORDER BY only; not sent to the client)
    let scoreExpr = `
      (LOWER(o.occupation_title) = LOWER(?)) * 100 +
      (LOWER(o.occupation_title) LIKE LOWER(CONCAT(?, '%'))) * 90 +
      (LOWER(o.occupation_title) LIKE LOWER(CONCAT('% ', ?, '%'))) * 85 +
      (LOWER(o.occupation_title) LIKE LOWER(CONCAT('%', ?, '%'))) * 80
    `;
    const scoreParams = [s, s, s, s];

    // Filter: at least fuzzy match on the main title
    let where = `LOWER(o.occupation_title) LIKE LOWER(CONCAT('%', ?, '%'))`;
    const whereParams = [s];

    // Optionally include alternative/reported titles in filtering and scoring
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
// 2) Fetch the three title categories by occupation_code (direct code lookup)
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
// 3) Title-based matching (already in use in your client)
// -----------------------------
app.post('/occupations/match-top', async (req, res) => {
  const occ = req.body?.occupation_code;
  const picksRaw = ensureArray(req.body?.titles).slice(0, 6); // Up to 6
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
// 4) Reverse aggregation: given codes, rank occupations and return UNMATCHED codes+titles (no upper limit)
// -----------------------------
app.post('/occupations/rank-by-codes', async (req, res) => {
  // Parse both input formats
  let selections = ensureArray(req.body?.selections)
    .map(x => ({ type: norm(x.type), code: (x.code ?? '').trim() }))
    .filter(x => x.type && x.code && ['knowledge','skill','tech'].includes(x.type));

  const kn2 = ensureArray(req.body?.knowledge_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'knowledge', code }));
  const sk2 = ensureArray(req.body?.skill_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'skill', code }));
  const te2 = ensureArray(req.body?.tech_codes).map(String).map(x => x.trim()).filter(Boolean).map(code => ({ type: 'tech', code }));
  selections = selections.concat(kn2, sk2, te2);

  // Deduplicate (removed the former "max 10 items" limit)
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

  // Full selected sets by type (used later to compute "unmatched")
  const selKn = new Set(selections.filter(x => x.type === 'knowledge').map(x => x.code));
  const selSk = new Set(selections.filter(x => x.type === 'skill').map(x => x.code));
  const selTe = new Set(selections.filter(x => x.type === 'tech').map(x => x.code));

  const conn = await pool.getConnection();
  try {
    // Preload selected codes' titles into maps
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

    // For each selected code, fetch linked occupations via the three relation tables
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

    // Aggregate hits per occupation
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

    // Build response: "unmatched" arrays include {code, title}
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
        count: kc + sc + tc,  // Still sort by total hit count
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
// (Optional) Quick sanity check for occupation_data
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

// Read session for debugging
app.get('/debug/me', (req, res) => {
  res.json({
    hasSession: !!req.session,
    sessionID: req.sessionID,
    userId: req.session?.userId ?? null
  });
});

// 1) Check if Redis is reachable
app.get('/debug/redis', async (_req, res) => {
  try {
    const pong = await redis.ping();
    return res.json({ ok: true, pong });
  } catch (e) {
    console.error('[debug/redis] error:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// 2) Direct Redis write test (helps rule out permission/ACL issues)
app.get('/debug/redis-write', async (_req, res) => {
  try {
    const key = 'sbridg:debug:write';
    await redis.set(key, '1', 'EX', 60);
    const val = await redis.get(key);
    return res.json({ ok: true, wrote: Boolean(val) });
  } catch (e) {
    console.error('[debug/redis-write] error:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// 3) More robust login demo: surface session.save errors as JSON (instead of HTML 500)
app.get('/debug/login', (req, res) => {
  req.session.userId = 'u-123';
  req.session.save((err) => {
    if (err) {
      console.error('[debug/login] session save error:', err);
      return res.status(500).json({ ok: false, where: 'session.save', error: String(err?.message || err) });
    }
    return res.json({ ok: true, sid: req.sessionID, set: { userId: req.session.userId } });
  });
});

// -----------------------------
// Start server
// -----------------------------

// — Place these handlers at the very end —
// Convert CORS rejections into 403 JSON, avoiding 500 + HTML
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked' });
  }
  return next(err);
});

// Generic catch-all error handler; always return JSON to ease debugging
app.use((err, req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: err?.message || String(err) });
});

// const { PORT = 8080 } = process.env;

app.listen(PORT, () => {
  console.log(`SkillBridge API listening on http://localhost:${PORT}`);
});
