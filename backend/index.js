// SkillBridge API
// Endpoints:
// - GET  /health
// - GET  /occupations/search-and-titles?s=keyword
// - GET  /occupations/:code/titles
// - POST /occupations/match-top
// - POST /occupations/rank-by-codes
// - GET  /anzsco/search?s=&first=&limit=   
// - GET  /anzsco/:code/skills              
// - GET  /api/anzsco/:code/training-advice 
// - GET  /api/anzsco/:code/demand          

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import { swaggerSpecEn, swaggerSpecZh } from './swagger.i18n.js';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';

import helmet from 'helmet';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import cookieParser from 'cookie-parser';

import { fileURLToPath } from 'url';
import path from 'node:path';

//------------------------=======================================
import initAnzscoTrainingRoutes from './anzsco.training.router.js';
import initAnzscoDemandRoutes   from './anzsco.demand.router.js';

import buildRouter from "./routes/map.data.fromtemp.js";
import initRankRoutes from './routes/occupations.rank.router.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ===================== Security =====================
// ---- Proxy and Infrastructure Settings ----
app.set('trust proxy', 1);

// ---- 解析 CORS 白名单（支持正则）----Parsing CORS whitelist (regular expressions supported)
const rawAllowlist = String(process.env.CORS_ALLOWLIST || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Treat CORS_ALLOWLIST items starting with "re:" as regular expressions, and the others as exact matches.
// 例如：CORS_ALLOWLIST="http://localhost:5173,https://foo.example.com,re:/^https:\/\/.+\.koyeb\.app$/"
const allowPatterns = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',

  /.+\.koyeb\.app$/,
  //Entries from environment variables
  ...rawAllowlist.map(x => (x.startsWith('re:') ? new RegExp(x.slice(3)) : x)),
];

// 帮助函数：Determine whether Origin matches the whitelist (string or regular expression)
function isOriginAllowed(origin) {
  return allowPatterns.some(p => (p instanceof RegExp ? p.test(origin) : p === origin));
}

// ---- CORS ----
app.use(cors({
  origin(origin, cb) {
    // 无 Origin（如 curl/postman/同源导航）时直接放行
    //Directly allow access when there is no Origin (such as curl/postman/same-origin navigation)
    if (!origin) return cb(null, true);
    if (isOriginAllowed(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
  maxAge: 600,
}));

// ---- Helmet / CSP ----
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Refine CSP: Allow Koyeb domains and whitelists to initiate XHR/fetch
// 细化 CSP：允许 Koyeb 域与白名单发起 XHR/fetch
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],

    "connect-src": [
      "'self'",
      "http:",
      "https:",
      "*.koyeb.app",

      ...allowPatterns.filter(x => typeof x === 'string'),
    ],
    "img-src": ["'self'", "data:"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "frame-ancestors": ["'none'"],
  },
}));

// ---- Session & Redis ----
const sameSiteFromEnv = String(process.env.SESSION_SAMESITE || 'lax').toLowerCase();
const sameSite = ['lax', 'strict', 'none'].includes(sameSiteFromEnv) ? sameSiteFromEnv : 'lax';

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

const redisStore = new RedisStore({ client: redis, prefix: 'sbridg:' });
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(session({
  name: process.env.SESSION_NAME || 'sbridg.sid',
  secret: process.env.SESSION_SECRET,
  store: redisStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // SameSite=None need secure=true
    sameSite,
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

// ===================== DB =====================
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

// ===================== Helpers =====================
const norm   = (s) => (s ?? '').replace(/[\r\n]/g, '').trim().toLowerCase();
const strip  = (s) => (s ?? '').replace(/[\r\n]/g, '');
const ensureArray = (a) => (Array.isArray(a) ? a : []);

// ======Static mapping of the first industry (not in the database)===
const ANZSCO_MAJOR = Object.freeze({
  '1': 'Managers',
  '2': 'Professionals',
  '3': 'Technicians and Trades Workers',
  '4': 'Community and Personal Service Workers',
  '5': 'Clerical and Administrative Workers',
  '6': 'Sales Workers',
  '7': 'Machinery Operators and Drivers',
  '8': 'Labourers',
});

// ===================== Health =====================
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: |-
 *       Returns `{ ok: true }` if the service and DB pool are reachable.
 *     x-summary-zh: 健康检查
 *     x-description-zh: |-
 *       如果服务与数据库可达，返回 `{ ok: true }`。
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *       '500':
 *         description: Server or DB error
 */
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

// ===================== ANZSCO  =====================
/**
 * GET /anzsco/search?industry=xxx&s=keyword&limit=10
 * - 按“行业 + 职业名或描述模糊”搜索，返回 6 位 anzsco_code 与标题
 * - Searching for "industry + title/description fuzzy" in ANZSCO returns the 6-digit anzsco_code and title.
 * - 如果不传 s，则仅按行业返回该行业内的前 N 个（按标题排序）
 * - If s is not passed, only the first N occupations in the industry will be returned (sorted by title)
 */
/**
 * @openapi
 * /anzsco/search:
 *   get:
 *     tags: [ANZSCO]
 *     operationId: searchANZSCOByIndustry
 *     summary: Search ANZSCO by industry and keyword
 *     description: |
 *       Fuzzy search **ANZSCO 6-digit codes** by **industry name** and optional title keyword.
 *       Sorting uses a relevance score: **exact > prefix > word-boundary > substring**.
 *       - Input is trimmed; matching is case-insensitive.
 *       - If `s` is empty or omitted, the API filters **only** by industry name.
 *     x-summary-zh: 按“行业 + 职业名或描述关键词”搜索 ANZSCO 六位职业
 *     x-description-zh: |
 *       依据 **行业名称** 与 **职业名/描述关键词** 做模糊检索，返回符合条件的 **ANZSCO 六位 code**。
 *       排序遵循相关性：**完全匹配 > 前缀 > 单词边界 > 子串**。输入自动去空格、不区分大小写；
 *       若不传 `s`，仅按行业筛选。
 *     parameters:
 *       - in: query
 *         name: industry
 *         required: true
 *         schema: { type: string }
 *         description: Industry name (fuzzy match, case-insensitive)
 *         examples:
 *           information: { value: "Information Media and Telecommunications", summary: example industry name }
 *       - in: query
 *         name: s
 *         schema: { type: string, minLength: 0 }
 *         allowEmptyValue: true
 *         description: Optional title or description keyword; if empty, only filters by industry.
 *         examples:
 *           engineer: { value: "engineer", summary: title keyword }
 *           empty: { value: "", summary: no keyword (filter by industry only) }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, minimum: 1, maximum: 50 }
 *         description: Max number of results to return (1–50)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *             examples:
 *               example_with_keyword:
 *                 summary: Information industry + engineer
 *                 value:
 *                   industry: "Information Media and Telecommunications"
 *                   items:
 *                     - { anzsco_code: "261313", anzsco_title: "Software Engineer" }
 *                     - { anzsco_code: "263311", anzsco_title: "Telecommunications Engineer" }
 *               example_industry_only:
 *                 summary: Industry only (no keyword)
 *                 value:
 *                   industry: "Education and Training"
 *                   items:
 *                     - { anzsco_code: "241111", anzsco_title: "Early Childhood (Pre-primary School) Teacher" }
 *                     - { anzsco_code: "241213", anzsco_title: "Primary School Teacher" }
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             examples:
 *               bad_industry:
 *                 summary: industry missing
 *                 value: { error: "param \"industry\" is required" }
 *       500:
 *         description: Server error
 */
app.get('/anzsco/search', async (req, res) => {
  const industry = String(req.query.industry ?? '').trim();
  const sRaw     = String(req.query.s ?? '').trim();
  const limit    = Math.min(Math.max(parseInt(req.query.limit ?? '12', 10) || 12, 1), 50);

  if (!industry) {
    return res.status(400).json({ error: 'param "industry" is required' });
  }

  const s = sRaw.toLowerCase();
  const strip = (x) => (x ?? '').replace(/[\r\n]/g, '');

  const conn = await pool.getConnection();
  try {
    // ====== Scoring algorithm: same as original (exact > prefix > word > substring) ======
    const titleScore = `
      (LOWER(COALESCE(a.anzsco_title,'')) = LOWER(?)) * 100 +
      (LOWER(COALESCE(a.anzsco_title,'')) LIKE LOWER(CONCAT(?, '%'))) * 90 +
      (LOWER(COALESCE(a.anzsco_title,'')) LIKE LOWER(CONCAT('% ', ?, '%'))) * 85 +
      (LOWER(COALESCE(a.anzsco_title,'')) LIKE LOWER(CONCAT('%', ?, '%'))) * 80
    `;
    const descScore = `
      (LOWER(COALESCE(a.anzsco_description,'')) = LOWER(?)) * 100 +
      (LOWER(COALESCE(a.anzsco_description,'')) LIKE LOWER(CONCAT(?, '%'))) * 90 +
      (LOWER(COALESCE(a.anzsco_description,'')) LIKE LOWER(CONCAT('% ', ?, '%'))) * 85 +
      (LOWER(COALESCE(a.anzsco_description,'')) LIKE LOWER(CONCAT('%', ?, '%'))) * 80
    `;
    const scoreExpr   = `GREATEST(${titleScore}, ${descScore})`;
    const scoreParams = [s, s, s, s,  s, s, s, s]; // title(4) + desc(4)

    // ====== WHERE：industry + optional keyword ======
    const where = s
      ? `LOWER(i.industry_name) LIKE LOWER(CONCAT('%', ?, '%')) AND (
           LOWER(COALESCE(a.anzsco_title,'')) LIKE CONCAT('%', ?, '%')
           OR LOWER(COALESCE(a.anzsco_description,'')) LIKE CONCAT('%', ?, '%')
         )`
      : `LOWER(i.industry_name) LIKE LOWER(CONCAT('%', ?, '%'))`;

    const whereParams = s ? [industry, s, s] : [industry];

    const sql = `
      SELECT DISTINCT a.anzsco_code, a.anzsco_title, a.anzsco_description
      FROM anzsco_data a
      JOIN anzsco_industry_map m ON a.anzsco_code = m.anzsco_code
      JOIN industry_dim i ON i.industry_id = m.industry_id
      WHERE ${where}
      ORDER BY ${scoreExpr} DESC, a.anzsco_title ASC, a.anzsco_code ASC
      LIMIT ?
    `;

    const params = [...whereParams, ...scoreParams, limit];
    const [rows] = await conn.query(sql, params);

    res.json({
      industry,
      items: rows.map(r => ({
        anzsco_code: r.anzsco_code,
        anzsco_title: strip(r.anzsco_title),
        anzsco_description: r.anzsco_description == null ? null : strip(r.anzsco_description),
      })),
    });
  } catch (e) {
    console.error('[anzsco/search] error:', e);
    res.status(500).json({ error: 'server_error' });
  } finally {
    conn.release();
  }
});

/**
 * GET /anzsco/:code/skills
 * - 输入 ANZSCO 6 位；通过 ANZSCO→OSCA→ISCO→SOC 找到 SOC occupation(s)
 * - Enter 6 digits of ANZSCO; find SOC occupation(s) via ANZSCO→OSCA→ISCO→SOC
 * - 返回这些 SOC 的 ability（knowledge/skill/tech），供前端修改后再做匹配
 * - Return the ability (knowledge/skill/tech) of these SOCs for the front-end to modify and match
 */
/**
 * @openapi
 * /anzsco/{code}/skills:
 *   get:
 *     tags: [ANZSCO]
 *     summary: Map ANZSCO (6-digit) to SOC occupations and aggregate abilities
 *     description: |
 *       Given an **ANZSCO 6-digit code**, follows the mapping chain **ANZSCO → OSCA → ISCO → SOC**,
 *       collects the mapped SOC occupations, and returns **distinct ability titles** (knowledge / skill / tech).
 *       These abilities are the pool for client-side selection before ranking.
 *     x-summary-zh: ANZSCO 六位映射至 SOC 并汇总能力清单
 *     x-description-zh: |
 *       输入 **ANZSCO 六位 code**，按 **ANZSCO → OSCA → ISCO → SOC** 映射链取到对应 SOC 职业集合，
 *       并汇总去重后的 **能力（知识/技能/技术）标题**，供前端后续挑选用于匹配职业。
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, pattern: '^[0-9]{6}$' }
 *         description: ANZSCO 6-digit code.
 *     responses:
 *       200:
 *         description: Aggregated abilities and mapped SOC occupations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SkillsResponse'
 *       400:
 *         description: Invalid ANZSCO code
 *         content:
 *           application/json:
 *             example: { error: "anzsco 6-digit code required" }
 *       500:
 *         description: Server error
 */
app.get('/anzsco/:code/skills', async (req, res) => {
  const anz6 = String(req.params.code || '').trim();
  if (!/^\d{6}$/.test(anz6)) {
    return res.status(400).json({ error: 'anzsco 6-digit code required' });
  }

  const conn = await pool.getConnection();
  try {
    // 1) ANZSCO -> OSCA -> ISCO -> SOC -> occupation_data
    const [socOcc] = await conn.query(
      `
      SELECT DISTINCT o.occupation_code, o.occupation_title
      FROM osca_anzsco_data      oa
      JOIN isco_osca_data        io ON io.osca_code = oa.osca_code
      JOIN soc_isco_data         si ON si.isco_code = io.isco_code
      JOIN occup_soc_data        os ON os.usa_soc_code = si.usa_soc_code
      JOIN occupation_data       o  ON o.occupation_code = os.occupation_code
      WHERE oa.anzsco_code = ?
      ORDER BY o.occupation_title
      `,
      [anz6]
    );

    if (socOcc.length === 0) {
      return res.json({
        anzsco: { code: anz6 },
        occupations: [],
        knowledge_titles: [],
        skill_titles: [],
        tech_titles: []
      });
    }

    const occCodes = socOcc.map(r => r.occupation_code);
    const placeholders = occCodes.map(()=>'?').join(',');

    // 2) Pull ability (merge all related SOCs and perform DISTINCT)
    const [kn] = await conn.query(
      `
      SELECT DISTINCT k.knowledge_code AS code, k.knowledge_title AS title
      FROM occup_know_data ok
      JOIN knowledge_data  k  ON k.knowledge_code = ok.knowledge_code
      WHERE ok.occupation_code IN (${placeholders})
      ORDER BY k.knowledge_title
      `,
      occCodes
    );
    const [sk] = await conn.query(
      `
      SELECT DISTINCT s.skill_code AS code, s.skill_title AS title
      FROM occup_skill_data os
      JOIN skill_data      s  ON s.skill_code = os.skill_code
      WHERE os.occupation_code IN (${placeholders})
      ORDER BY s.skill_title
      `,
      occCodes
    );
    const [te] = await conn.query(
      `
      SELECT DISTINCT t.tech_skill_code AS code, t.tech_title AS title
      FROM occup_tech_data ot
      JOIN technology_skill_data t ON t.tech_skill_code = ot.tech_skill_code
      WHERE ot.occupation_code IN (${placeholders})
      ORDER BY t.tech_title
      `,
      occCodes
    );

    res.json({
      anzsco: { code: anz6, major_first: anz6[0], major_name: ANZSCO_MAJOR[anz6[0]] },
      occupations: socOcc.map(r => ({
        occupation_code: r.occupation_code,
        occupation_title: strip(r.occupation_title)
      })),
      knowledge_titles: kn.map(x => ({ code: x.code, title: strip(x.title) })),
      skill_titles:     sk.map(x => ({ code: x.code, title: strip(x.title) })),
      tech_titles:      te.map(x => ({ code: x.code, title: strip(x.title) })),
    });
  } catch (e) {
    console.error('[anzsco/:code/skills] error:', e);
    res.status(500).json({ error: 'server_error' });
  } finally {
    conn.release();
  }
});

// ==========================================
app.use('/api/anzsco', initAnzscoTrainingRoutes(pool)); // -> /api/anzsco/:code/training-advice
app.use('/api/anzsco', initAnzscoDemandRoutes(pool));   // -> /api/anzsco/:code/demand


app.use("/api", buildRouter(pool));
app.use('/', initRankRoutes(pool));



// ===================== Debug & Errors =====================
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

app.get('/debug/me', (req, res) => {
  res.json({ hasSession: !!req.session, sessionID: req.sessionID, userId: req.session?.userId ?? null });
});

/**
 * @openapi
 * /debug/redis:
 *   get:
 *     tags: [Debug]
 *     summary: Redis connectivity check
 *     x-summary-zh: Redis 连接检查
 *     responses:
 *       200:
 *         description: OK
 *       500:
 *         description: Not reachable
 */
app.get('/debug/redis', async (_req, res) => {
  try {
    const pong = await redis.ping();
    return res.json({ ok: true, pong });
  } catch (e) {
    console.error('[debug/redis] error:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

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

/**
 * @openapi
 * /debug/login:
 *   get:
 *     tags: [Debug]
 *     summary: Demo login (session.save surfaced as JSON)
 *     x-summary-zh: Demo 登录（将 session.save 错误以 JSON 暴露）
 *     responses:
 *       200:
 *         description: OK
 *       500:
 *         description: Session save error
 */
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




// ===== Swagger Documentation (Chinese and English)=====
app.get('/openapi.en.json', (_req, res) => res.json(swaggerSpecEn));
app.get('/openapi.zh.json', (_req, res) => res.json(swaggerSpecZh));

// A /docs page with a built-in drop-down switch
app.use('/docs',
  swaggerUi.serve,
  swaggerUi.setup(null, {
    explorer: true,
    swaggerOptions: {
      urls: [
        { url: '/openapi.en.json', name: 'English' },
        { url: '/openapi.zh.json', name: '中文' },
      ],
    },
    customSiteTitle: 'SkillBridge API Docs',
  }),
);


// error
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked' });
  }
  return next(err);
});
app.use((err, req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: err?.message || String(err) });
});

app.listen(PORT, () => {
  console.log(`SkillBridge API listening on http://localhost:${PORT}`);
});
