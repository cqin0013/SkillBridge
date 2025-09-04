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

// === 新增：三项安全增强依赖 ===
import helmet from 'helmet';                     // HTTP 安全头 & CSP
import session from 'express-session';           // 会话 & 安全 Cookie
//import RedisStore from 'connect-redis';          // Session 持久化（Redis）
// import { RedisStore } from 'connect-redis';
// import Redis from 'ioredis';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import cookieParser from 'cookie-parser';

const app = express();

// 先做 body 解析（按需保留原限制）
app.use(express.json({ limit: '1mb' }));

// ===================== 三项安全增强开始 =====================
// 1) 严格 CORS（基于白名单），同时开启凭证以便携带 Cookie/Session
// 需要配置环境变量：CORS_ALLOWLIST=https://a.example.com,https://b.example.com
app.set('trust proxy', 1); // 在 Render/反向代理后面运行时，确保 secure Cookie 正常生效

const allowlist = String(process.env.CORS_ALLOWLIST || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // 非浏览器(无 Origin)或在白名单中的源允许通过；如需更严，去掉 !origin 分支
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true, // 允许携带 Cookie（与 session 配套）
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-CSRF-Token'],
  maxAge: 600,
}));

// 2) HTTP 头（Helmet & CSP）
// - Helmet 提供常用安全头；CSP 仅示例，如果纯 API 也可保留为最小配置
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // 若提供下载/跨域资源可用
}));

// Content-Security-Policy 示例：如你的服务仅为 API，可保留最小规则
app.use(helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],
    // 允许与白名单前端通信（如浏览器使用 fetch 调用 API）
    "connect-src": ["'self'"].concat(allowlist),
    "img-src": ["'self'", "data:"],
    "script-src": ["'self'"],             // 不允许第三方脚本；如必须再按需放开
    "style-src": ["'self'", "'unsafe-inline'"], // 仅在确有需要时保留 'unsafe-inline'
    "frame-ancestors": ["'none'"],        // 禁止被 iframe 嵌套，防点击劫持
  },
}));

// 3) 会话 & 安全 Cookie（Redis 持久化）
// 需要环境变量：
//   SESSION_SECRET=强随机字符串
//   SESSION_NAME=sbridg.sid (可选)
//   COOKIE_DOMAIN=.your-frontend.com (可选；多子域共享时设置)
//   REDIS_URL=redis://user:pass@host:6379
//   SESSION_SAMESITE=none|lax|strict (推荐跨站时用 none)
const sameSiteFromEnv = String(process.env.SESSION_SAMESITE || 'lax').toLowerCase();
const sameSite = ['lax', 'strict', 'none'].includes(sameSiteFromEnv) ? sameSiteFromEnv : 'lax';

// Upstash/Redis Cloud 建议使用 rediss:// (TLS)
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

// 便于排错的日志
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
  rolling: true, // 每次请求刷新过期时间（可按需关闭）
  cookie: {
    httpOnly: true,                               // 阻止 JS 读取，缓解 XSS 窃取
    secure: process.env.NODE_ENV === 'production',// 生产强制 HTTPS
    sameSite,                                     // CSRF 风险低且兼容度好；跨站用 none
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAge: 1000 * 60 * 60 * 8,                   // 8 小时
  },
}));
// ===================== 三项安全增强结束 =====================

// ===================== 数据库连接 =====================
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
//
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
// 4) 基于 code 反向聚合到职业，返回【未命中的 codes+titles】（无数量上限）
// -----------------------------
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



// 读取 session
app.get('/debug/me', (req, res) => {
  res.json({
    hasSession: !!req.session,
    sessionID: req.sessionID,
    userId: req.session?.userId ?? null
  });
});



// 1) 检查 Redis 是否可用
app.get('/debug/redis', async (_req, res) => {
  try {
    const pong = await redis.ping();
    return res.json({ ok: true, pong });
  } catch (e) {
    console.error('[debug/redis] error:', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// 2) 直接测试 Redis 写入（排除权限/ACL 问题）
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

// 3) 更健壮的登录：把 session.save 的错误返回为 JSON（而不是 HTML 500）
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

// —— 放在所有路由的最后 ——
// 专门把 CORS 拦截改成 403 JSON，避免 500 + HTML
// —— 放在所有路由的最后，app.listen 之前 ——
// 先处理 CORS
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS blocked' });
  }
  return next(err);
});

// 再兜底处理其它错误，返回 JSON，方便你看到具体原因
app.use((err, req, res, _next) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: err?.message || String(err) });
});


//const { PORT = 8080 } = process.env;

app.listen(PORT, () => {
  console.log(`SkillBridge API listening on http://localhost:${PORT}`);
});
