// index.js
// SkillBridge API
// Endpoints:
// - GET  /health
// - GET  /occupations/search-and-titles?s=keyword
// - GET  /occupations/:code/titles
// - POST /occupations/match-top
// - POST /occupations/rank-by-codes
// - GET  /anzsco/search?s=&first=&limit=   <-- 新增（澳洲：首位+关键词模糊查 6 位 ANZSCO）
// - GET  /anzsco/:code/skills              <-- 新增（澳洲6位 -> 映射到 SOC -> 返回 ability）
// - GET  /api/anzsco/:code/training-advice <-- 已有（课程建议）
// - GET  /api/anzsco/:code/demand          <-- 已有（地区需求）

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

// ✅ ANZSCO 两个子路由（你已经有）
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
// ---- 代理与基础设置 ----
app.set('trust proxy', 1);

// ---- 解析 CORS 白名单（支持正则）----
const rawAllowlist = String(process.env.CORS_ALLOWLIST || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// 把 CORS_ALLOWLIST 中以 "re:" 开头的项当作正则，其它当作精确匹配
// 例如：CORS_ALLOWLIST="http://localhost:5173,https://foo.example.com,re:/^https:\/\/.+\.koyeb\.app$/"
const allowPatterns = [
  // 默认内置几个常用来源（保留你原来的本地端口）
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  // ✅ 内置 Koyeb 子域通配
  /.+\.koyeb\.app$/,
  // 来自环境变量的条目
  ...rawAllowlist.map(x => (x.startsWith('re:') ? new RegExp(x.slice(3)) : x)),
];

// 帮助函数：判断 Origin 是否匹配白名单（字符串或正则）
function isOriginAllowed(origin) {
  return allowPatterns.some(p => (p instanceof RegExp ? p.test(origin) : p === origin));
}

// ---- CORS ----
app.use(cors({
  origin(origin, cb) {
    // 无 Origin（如 curl/postman/同源导航）时直接放行
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

// 这里只保留你启用的跨源资源策略
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 细化 CSP：允许 Koyeb 域与白名单发起 XHR/fetch
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],
    // ✅ 关键：允许同源 + http/https + *.koyeb.app + 环境变量白名单
    "connect-src": [
      "'self'",
      "http:",
      "https:",
      "*.koyeb.app",
      // 把精确字符串白名单也纳入 CSP（正则无法直接放 CSP，这里仅加入字符串项）
      ...allowPatterns.filter(x => typeof x === 'string'),
    ],
    "img-src": ["'self'", "data:"],
    "script-src": ["'self'"],          // 如果你用 swagger-ui-express 且需要内联脚本，改为 "'self'", "'unsafe-inline'"
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
    secure: process.env.NODE_ENV === 'production', // SameSite=None 需要 secure=true
    sameSite,
    // 提醒：在 Koyeb 的二级域名环境一般不要显式设置 cookie domain
    // 否则跨子域可能失效。没有强需求就保持 undefined。
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

// ✅ 第1位行业静态映射（产品图里的对照表；数据库里没有）
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

// ===================== ANZSCO 扩展接口（新增） =====================

/**
 * GET /anzsco/search?s=keyword&first=1&limit=10
 * - 在 ANZSCO 里做“首位行业 + 标题模糊”搜索，返回 6 位 anzsco_code 与标题
 * - 如果不传 s，则仅按 first 返回该行业内的前 N 个（按标题排序）
 */
// 复用现有模糊打分逻辑的 ANZSCO 搜索：首位行业 + 标题模糊
/**
 * @openapi
 * /anzsco/search:
 *   get:
 *     tags: [ANZSCO]
 *     operationId: searchANZSCO
 *     summary: Search ANZSCO by first-digit (major group) and keyword
 *     description: |
 *       Fuzzy search **ANZSCO 6-digit codes** by **major group** (first digit 1..8) and optional title keyword.
 *       Sorting uses a relevance score: **exact > prefix > word-boundary > substring**.
 *       - Input is trimmed; title matching is case-insensitive.
 *       - If `s` is empty or omitted, the API filters **only** by major group.
 *     x-summary-zh: 按“首位行业 + 标题关键词”搜索 ANZSCO 六位职业
 *     x-description-zh: |
 *       依据 **首位行业（1..8）** 与**标题关键词**做模糊检索，返回符合条件的 **ANZSCO 六位 code**，
 *       排序遵循相关性：**完全匹配 > 前缀 > 单词边界 > 子串**。输入会自动去空格、不区分大小写；
 *       若不传 `s`，仅按首位行业筛选。
 *     parameters:
 *       - in: query
 *         name: first
 *         required: true
 *         schema: { type: string, enum: ["1","2","3","4","5","6","7","8"] }
 *         description: Major group first digit (1..8).
 *         examples:
 *           professionals: { value: "2", summary: Professionals }
 *       - in: query
 *         name: s
 *         schema: { type: string, minLength: 0 }
 *         allowEmptyValue: true
 *         description: Optional title keyword; if empty, only filters by major group.
 *         examples:
 *           engineer: { value: "engineer", summary: title keyword }
 *           empty:    { value: "", summary: no keyword (filter by major only) }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, minimum: 1, maximum: 50 }
 *         description: Max number of results to return (1–50).
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *             examples:
 *               professionals_engineer:
 *                 summary: Professionals + engineer
 *                 value:
 *                   major: { first: "2", name: "Professionals" }
 *                   items:
 *                     - { anzsco_code: "261313", anzsco_title: "Software Engineer" }
 *                     - { anzsco_code: "233311", anzsco_title: "Electrical Engineer" }
 *               professionals_only:
 *                 summary: Professionals only (no keyword)
 *                 value:
 *                   major: { first: "2", name: "Professionals" }
 *                   items:
 *                     - { anzsco_code: "234513", anzsco_title: "Biochemist" }
 *                     - { anzsco_code: "221111", anzsco_title: "Accountant (General)" }
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             examples:
 *               bad_first:
 *                 summary: first out of range
 *                 value: { error: "param \"first\" must be 1..8" }
 *               bad_limit:
 *                 summary: limit out of range
 *                 value: { error: "param \"limit\" must be between 1 and 50" }
 *       500:
 *         description: Server error
 */
app.get('/anzsco/search', async (req, res) => {
  const sRaw  = String(req.query.s ?? '').trim();
  const first = String(req.query.first ?? '').trim(); // '1'..'8'
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '12', 10) || 12, 1), 50);

  if (!first || !/^[1-8]$/.test(first)) {
    return res.status(400).json({ error: 'param "first" must be 1..8' });
  }

  const s = sRaw.toLowerCase();
  const strip = (x) => (x ?? '').replace(/[\r\n]/g, '');

  const conn = await pool.getConnection();
  try {
    // ===== 打分：分别对 title / description 计算，再取最大值作为最终 score =====
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
    const scoreExpr = `GREATEST( ${titleScore} , ${descScore} )`;
    const scoreParams = [s, s, s, s,  s, s, s, s]; // title(4) + desc(4)

    // ===== WHERE：首位行业 + （可选）标题/描述模糊 =====
    const where = s
      ? `a.anzsco_code LIKE ? AND (
           LOWER(COALESCE(a.anzsco_title,'')) LIKE CONCAT('%', ?, '%')
           OR LOWER(COALESCE(a.anzsco_description,'')) LIKE CONCAT('%', ?, '%')
         )`
      : `a.anzsco_code LIKE ?`;
    const whereParams = s ? [`${first}%`, s, s] : [`${first}%`];

    const sql = `
      SELECT a.anzsco_code, a.anzsco_title, a.anzsco_description
      FROM anzsco_data a
      WHERE ${where}
      ORDER BY ${scoreExpr} DESC, a.anzsco_title ASC, a.anzsco_code ASC
      LIMIT ?
    `;

    // 参数顺序：WHERE → ORDER BY(评分) → LIMIT
    const params = [...whereParams, ...scoreParams, limit];

    const [rows] = await conn.query(sql, params);

    res.json({
      major: { first, name: ANZSCO_MAJOR[first] },
      items: rows.map(r => ({
        anzsco_code: r.anzsco_code,
        anzsco_title: strip(r.anzsco_title),
        // 若数据库为 NULL，直接返回 null；否则去掉换行
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
 * - 返回这些 SOC 的 ability（knowledge/skill/tech），供前端修改后再做匹配
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

    // 2) 拉取 ability（合并所有关联 SOC，做 DISTINCT）
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

// ===================== 已有的 ANZSCO 路由（课程/需求） =====================
app.use('/api/anzsco', initAnzscoTrainingRoutes(pool)); // -> /api/anzsco/:code/training-advice
app.use('/api/anzsco', initAnzscoDemandRoutes(pool));   // -> /api/anzsco/:code/demand

// ===================== 既有的 SOC 侧接口（保持不变） =====================
// ===== 推荐职业 + 未命中 ability 列表 =====
// 请求体可两种写法（二选一或混用）:
// 1) { selections:[{type:'knowledge'|'skill'|'tech', code:'...'}, ...] }
// 2) { knowledge_codes:['2.C.1.a',...], skill_codes:['2.B.1.e',...], tech_codes:['43233208',...] }


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




// 在所有业务路由之后、错误处理中间件之前挂载：
// ===== Swagger 文档（中英文）=====
app.get('/openapi.en.json', (_req, res) => res.json(swaggerSpecEn));
app.get('/openapi.zh.json', (_req, res) => res.json(swaggerSpecZh));

// 方式 A：一个 /docs 页面，内置下拉切换（推荐）
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


// 错误处理
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
