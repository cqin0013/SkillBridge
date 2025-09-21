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

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ===================== Security =====================
app.set('trust proxy', 1);

const allowlist = String(process.env.CORS_ALLOWLIST || '')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
  maxAge: 600,
}));

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],
    "connect-src": ["'self'"].concat(allowlist),
    "img-src": ["'self'", "data:"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "frame-ancestors": ["'none'"],
  },
}));

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
    secure: process.env.NODE_ENV === 'production',
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
 *     tags: [Meta]
 *     summary: Health check
 *     x-summary-zh: 健康检查
 *     description: "Returns `{ ok: true }` if the service and DB pool are reachable."
 *     x-description-zh: "如果服务与数据库可达，返回 `{ ok: true }`。"
 *     responses:
 *       200:
 *         description: OK
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
 *     summary: Search ANZSCO by first digit (major group) and keyword
 *     x-summary-zh: 按首位行业与关键词搜索 ANZSCO
 *     description: Returns 6-digit ANZSCO codes filtered by the first digit (major group 1..8) and optional title keyword.
 *     x-description-zh: 在 ANZSCO 中按**第 1 位行业**（1..8）与**标题关键词**进行模糊检索，返回 6 位 ANZSCO 代码。
 *     parameters:
 *       - in: query
 *         name: first
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["1","2","3","4","5","6","7","8"]
 *         description: Major group digit (1..8).
 *         x-description-zh: 第 1 位行业代码（1..8）。
 *       - in: query
 *         name: s
 *         schema: { type: string }
 *         description: Optional title keyword.
 *         x-description-zh: 标题关键词（可选）。
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, minimum: 1, maximum: 50 }
 *         description: Max items to return (1..50).
 *         x-description-zh: 返回条数上限（1..50）。
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResponse'
 *             examples:
 *               sample:
 *                 summary: Professionals + engineer
 *                 value:
 *                   major: { first: "2", name: "Professionals" }
 *                   items:
 *                     - { anzsco_code: "261313", anzsco_title: "Software Engineer" }
 *                     - { anzsco_code: "233311", anzsco_title: "Electrical Engineer" }
 */

app.get('/anzsco/search', async (req, res) => {
  const sRaw  = String(req.query.s ?? '').trim();
  const first = String(req.query.first ?? '').trim(); // '1'..'8'
  const limit = Math.min(Math.max(parseInt(req.query.limit ?? '12', 10) || 12, 1), 50);

  if (!first || !/^[1-8]$/.test(first)) {
    return res.status(400).json({ error: 'param "first" must be 1..8' });
  }

  const s = sRaw.toLowerCase();

  const conn = await pool.getConnection();
  try {
    // 和 /occupations/search-and-titles 一样的评分表达式（只是列改为 anzsco_title）
    const scoreExpr = `
      (LOWER(a.anzsco_title) = LOWER(?)) * 100 +
      (LOWER(a.anzsco_title) LIKE LOWER(CONCAT(?, '%'))) * 90 +
      (LOWER(a.anzsco_title) LIKE LOWER(CONCAT('% ', ?, '%'))) * 85 +
      (LOWER(a.anzsco_title) LIKE LOWER(CONCAT('%', ?, '%'))) * 80
    `;
    const scoreParams = [s, s, s, s];

    // 过滤条件：首位行业 + （可选）标题模糊
    const where = s
      ? `a.anzsco_code LIKE ? AND LOWER(a.anzsco_title) LIKE CONCAT('%', ?, '%')`
      : `a.anzsco_code LIKE ?`;
    const whereParams = s ? [`${first}%`, s] : [`${first}%`];

    const sql = `
      SELECT a.anzsco_code, a.anzsco_title
      FROM anzsco_data a
      WHERE ${where}
      ORDER BY ${scoreExpr} DESC, a.anzsco_title ASC
      LIMIT ?
    `;

    // ✅ 关键修正：参数顺序必须是 WHERE → ORDER BY(评分) → LIMIT
    const params = [...whereParams, ...scoreParams, limit];

    const [rows] = await conn.query(sql, params);

    res.json({
      major: { first, name: ANZSCO_MAJOR[first] },
      items: rows.map(r => ({
        anzsco_code: r.anzsco_code,
        anzsco_title: strip(r.anzsco_title),
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
 *     summary: Map ANZSCO (6-digit) to SOC abilities
 *     x-summary-zh: ANZSCO(6位) 映射到 SOC 能力清单
 *     description: Resolve ANZSCO→OSCA→ISCO→SOC, then return merged ability titles (knowledge/skill/tech) of all linked SOC occupations.
 *     x-description-zh: 通过 ANZSCO→OSCA→ISCO→SOC 映射，汇总所有关联 SOC 的知识/技能/技术标题并去重返回。
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, pattern: '^[0-9]{6}$' }
 *         description: 6-digit ANZSCO code.
 *         x-description-zh: 6 位 ANZSCO 代码。
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SkillsResponse'
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
// ...（此处保留你原有的 /occupations/search-and-titles /:code/titles /match-top /rank-by-codes 代码不变）
/* 你的原有 SOC 路由全部保留——为节省篇幅，这里不再粘贴；直接使用你文件里的现成实现 */

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
