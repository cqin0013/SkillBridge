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
 *     tags: [System]
 *     summary: Health check
 *     description: |
 *       Returns `{ ok: true }` if the API is up and the DB pool is reachable.
 *     x-summary-zh: 健康检查
 *     x-description-zh: |
 *       当服务与数据库连接正常时返回 `{ ok: true }`。
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             example: { ok: true }
 *       500:
 *         description: Service or DB not reachable
 *         content:
 *           application/json:
 *             example: { ok: false, error: "db error" }
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
 *     summary: Search ANZSCO by first-digit (major group) and keyword
 *     description: |
 *       Fuzzy search **ANZSCO 6-digit codes** by **major group** (first digit 1..8) and optional title keyword.
 *       Sorts results by a relevance score (exact/prefix/boundary/substring).
 *     x-summary-zh: 按“首位行业 + 标题关键词”搜索 ANZSCO 六位职业
 *     x-description-zh: |
 *       依据 **首位行业（1..8）** 与**标题关键词**做模糊检索，返回符合条件的 **ANZSCO 六位 code**，按相关性排序（完全匹配 > 前缀 > 单词边界 > 子串）。
 *     parameters:
 *       - in: query
 *         name: first
 *         required: true
 *         schema: { type: string, enum: ["1","2","3","4","5","6","7","8"] }
 *         description: Major group first digit (1..8).
 *       - in: query
 *         name: s
 *         schema: { type: string }
 *         description: Optional title keyword; if empty, only filters by major group.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 12, minimum: 1, maximum: 50 }
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
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             example: { error: "param \"first\" must be 1..8" }
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

/**
 * @openapi
 * /occupations/rank-by-codes:
 *   post:
 *     tags: [SOC]
 *     summary: Rank occupations by selected ability codes (knowledge / skill / tech)
 *     description: |
 *       Reverse-lookup by **ability codes** and aggregate hits per occupation,
 *       sorted by total hits (knowledge + skill + tech). Also returns **unmatched**
 *       codes (with titles) per occupation for gap highlighting.
 *     x-summary-zh: 基于能力代码（知识/技能/技术）聚合并排序职业
 *     x-description-zh: |
 *       以 **能力代码** 反向查职业，并统计每个职业的命中数（知识+技能+技术），按总命中降序。
 *       同时返回该职业的 **未命中的代码（含标题）**，便于展示能力缺口和培训建议。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               selections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [type, code]
 *                   properties:
 *                     type: { type: string, enum: [knowledge, skill, tech] }
 *                     code: { type: string }
 *               knowledge_codes:
 *                 type: array
 *                 items: { type: string }
 *               skill_codes:
 *                 type: array
 *                 items: { type: string }
 *               tech_codes:
 *                 type: array
 *                 items: { type: string }
 *           examples:
 *             mixed:
 *               summary: Mixed input format
 *               value:
 *                 selections:
 *                   - { type: "knowledge", code: "2.C.1.a" }
 *                   - { type: "skill",     code: "2.A.1.b" }
 *                 tech_codes: ["43233208"]
 *     responses:
 *       200:
 *         description: Ranked occupations with unmatched codes by category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_selected: { type: integer, example: 3 }
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       occupation_code: { type: string, example: "15-2031.00" }
 *                       occupation_title:{ type: string, example: "Operations Research Analysts" }
 *                       count:           { type: integer, example: 5 }
 *                       unmatched:
 *                         type: object
 *                         properties:
 *                           knowledge:
 *                             type: array
 *                             items: { type: object, properties: { code:{type:string}, title:{type:[string,"null"]} } }
 *                           skill:
 *                             type: array
 *                             items: { type: object, properties: { code:{type:string}, title:{type:[string,"null"]} } }
 *                           tech:
 *                             type: array
 *                             items: { type: object, properties: { code:{type:string}, title:{type:[string,"null"]} } }
 *             examples:
 *               sample:
 *                 summary: Example response
 *                 value:
 *                   total_selected: 3
 *                   items:
 *                     - occupation_code: "15-2031.00"
 *                       occupation_title: "Operations Research Analysts"
 *                       count: 3
 *                       unmatched:
 *                         knowledge: []
 *                         skill:     []
 *                         tech:      [ { code: "43239999", title: "Some tool" } ]
 *       400:
 *         description: No codes provided
 *         content:
 *           application/json:
 *             example: { error: "no codes provided" }
 *       500:
 *         description: Server error
 */
app.post('/occupations/rank-by-codes', async (req, res) => {
  // 解析入参
  let selections = ensureArray(req.body?.selections)
    .map(x => ({ type: String(x.type||'').toLowerCase(), code: String(x.code||'').trim() }))
    .filter(x => x.type && x.code && ['knowledge','skill','tech'].includes(x.type));

  const kn2 = ensureArray(req.body?.knowledge_codes).map(x => ({ type:'knowledge', code:String(x).trim() }));
  const sk2 = ensureArray(req.body?.skill_codes).map(x => ({ type:'skill',     code:String(x).trim() }));
  const te2 = ensureArray(req.body?.tech_codes).map(x => ({ type:'tech',      code:String(x).trim() }));
  selections = selections.concat(kn2, sk2, te2);

  // 去重
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

  // 选中全集（用于后面求未命中）
  const selKn = new Set(selections.filter(x => x.type==='knowledge').map(x => x.code));
  const selSk = new Set(selections.filter(x => x.type==='skill').map(x => x.code));
  const selTe = new Set(selections.filter(x => x.type==='tech').map(x => x.code));

  const conn = await pool.getConnection();
  try {
    // 先把“选中 code → 标题”做映射，方便生成 unmatched 的 {code,title}
    const knTitleMap = new Map(), skTitleMap = new Map(), teTitleMap = new Map();

    if (selKn.size) {
      const codes = [...selKn];
      const [rows] = await conn.query(
        `SELECT knowledge_code, knowledge_title FROM knowledge_data
          WHERE knowledge_code IN (${codes.map(()=>'?').join(',')})`, codes);
      rows.forEach(r => knTitleMap.set(r.knowledge_code, strip(r.knowledge_title)));
    }
    if (selSk.size) {
      const codes = [...selSk];
      const [rows] = await conn.query(
        `SELECT skill_code, skill_title FROM skill_data
          WHERE skill_code IN (${codes.map(()=>'?').join(',')})`, codes);
      rows.forEach(r => skTitleMap.set(r.skill_code, strip(r.skill_title)));
    }
    if (selTe.size) {
      const codes = [...selTe];
      const [rows] = await conn.query(
        `SELECT tech_skill_code, tech_title FROM technology_skill_data
          WHERE tech_skill_code IN (${codes.map(()=>'?').join(',')})`, codes);
      rows.forEach(r => teTitleMap.set(r.tech_skill_code, strip(r.tech_title)));
    }

    // 命中职业聚合
    const results = [];
    if (selKn.size) {
      const codes = [...selKn];
      const [rows] = await conn.query(
        `SELECT ok.occupation_code, o.occupation_title, ok.knowledge_code AS code, 'knowledge' AS type
           FROM occup_know_data ok
           JOIN occupation_data o ON o.occupation_code = ok.occupation_code
          WHERE ok.knowledge_code IN (${codes.map(()=>'?').join(',')})`, codes);
      results.push(...rows);
    }
    if (selSk.size) {
      const codes = [...selSk];
      const [rows] = await conn.query(
        `SELECT os.occupation_code, o.occupation_title, os.skill_code AS code, 'skill' AS type
           FROM occup_skill_data os
           JOIN occupation_data o ON o.occupation_code = os.occupation_code
          WHERE os.skill_code IN (${codes.map(()=>'?').join(',')})`, codes);
      results.push(...rows);
    }
    if (selTe.size) {
      const codes = [...selTe];
      const [rows] = await conn.query(
        `SELECT ot.occupation_code, o.occupation_title, ot.tech_skill_code AS code, 'tech' AS type
           FROM occup_tech_data ot
           JOIN occupation_data o ON o.occupation_code = ot.occupation_code
          WHERE ot.tech_skill_code IN (${codes.map(()=>'?').join(',')})`, codes);
      results.push(...rows);
    }

    // 以职业为键做聚合（记录命中的三类 code 集合）
    const byOcc = new Map();
    for (const r of results) {
      const key = r.occupation_code;
      const entry = byOcc.get(key) || {
        occupation_code: r.occupation_code,
        occupation_title: strip(r.occupation_title),
        matched: { knowledge_codes: new Set(), skill_codes: new Set(), tech_codes: new Set() }
      };
      if (r.type==='knowledge') entry.matched.knowledge_codes.add(r.code);
      if (r.type==='skill')     entry.matched.skill_codes.add(r.code);
      if (r.type==='tech')      entry.matched.tech_codes.add(r.code);
      byOcc.set(key, entry);
    }

    // 生成结果：按命中数量降序；并附上“未命中”codes+titles
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
        count: kc + sc + tc,  // 命中总数（用于排序）
        unmatched: {
          knowledge: unmatched_kn,
          skill:     unmatched_sk,
          tech:      unmatched_te
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
