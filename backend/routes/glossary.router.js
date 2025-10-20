// backend/routes/glossary.router.js
import { Router } from 'express';
import { json as cache, withSingleFlight } from '../cache.js';

/** Split into string array */
function splitList(v) {
  if (!v || typeof v !== 'string') return [];
  return v.split(/[,;|；，、]+/g).map(s => s.trim()).filter(Boolean);
}


function isLikelyPrefix(q) {
  return /^[A-Za-z]+$/.test(q) && q.length >= 1 && q.length <= 50;
}


function toPayload(row) {
  return {
    term: row.term || '',
    description: row.description || '',
    acronym: row.acronym || undefined,
    also_called: splitList(row.also_called),
    see_also: splitList(row.see_also),
  };
}

/** Exact hit (returns a single entry or null) */
async function exactHit(pool, q) {
  // 1) word_data is accurate
  {
    const [rows] = await pool.query(
      `
      SELECT 
        wd.word       AS term,
        wd.description,
        wd.acronym,
        wd.also_called,
        wd.see_also
      FROM word_data wd
      WHERE wd.word = ? OR wd.acronym = ?
      LIMIT 1
      `,
      [q, q]
    );
    if (rows.length) return rows[0];
  }

  // 2) acronyms accurate -> backfill word_data
  const [aRows] = await pool.query(
    `
    SELECT acronym, full_form
    FROM acronyms
    WHERE acronym = ? OR full_form = ?
    LIMIT 1
    `,
    [q, q]
  );
  if (!aRows.length) return null;

  const { acronym, full_form } = aRows[0];
  const [rows2] = await pool.query(
    `
    SELECT 
      wd.word       AS term,
      wd.description,
      wd.acronym,
      wd.also_called,
      wd.see_also
    FROM word_data wd
    WHERE wd.word = ?
    LIMIT 1
    `,
    [full_form]
  );
  if (rows2.length) {
    rows2[0].acronym = rows2[0].acronym || acronym || null;
    return rows2[0];
  }

  return {
    term: full_form,
    description: null,
    acronym: acronym || null,
    also_called: null,
    see_also: null,
  };
}

/** Prefix hit (merge word_data with acronyms, remove duplicates, sort) → return to original row */
async function prefixRaw(pool, q) {
  const like = `${q}%`;

  // A) word_data prefix matching (acronym first, then word)
  const [wRows] = await pool.query(
    `
    SELECT 
      wd.word       AS term,
      wd.description,
      wd.acronym,
      wd.also_called,
      wd.see_also,
      CASE WHEN wd.acronym LIKE ? THEN 0 ELSE 1 END AS prio
    FROM word_data wd
    WHERE wd.acronym LIKE ? OR wd.word LIKE ?
    ORDER BY prio ASC, CHAR_LENGTH(wd.word) ASC
    `,
    [like, like, like]
  );

  // B) acronyms prefix matching (may map to word_data, may or may not be defined)
  const [aRows] = await pool.query(
    `
    SELECT acronym, full_form,
           CASE WHEN acronym LIKE ? THEN 0 ELSE 1 END AS prio
    FROM acronyms
    WHERE acronym LIKE ? OR full_form LIKE ?
    ORDER BY prio ASC, CHAR_LENGTH(full_form) ASC
    `,
    [like, like, like]
  );

  // Try to backfill the full_form of acronyms to word_data definition
  const out = [...wRows];
  for (const a of aRows) {
    const [rows2] = await pool.query(
      `
      SELECT 
        wd.word       AS term,
        wd.description,
        wd.acronym,
        wd.also_called,
        wd.see_also
      FROM word_data wd
      WHERE wd.word = ?
      LIMIT 1
      `,
      [a.full_form]
    );
    if (rows2.length) {
      rows2[0].acronym = rows2[0].acronym || a.acronym || null;
      rows2[0].prio = a.prio;
      out.push(rows2[0]);
    } else {
      out.push({
        term: a.full_form,
        description: null,
        acronym: a.acronym || null,
        also_called: null,
        see_also: null,
        prio: a.prio,
      });
    }
  }

  // Deduplication: Press term → keep the one with higher priority/shorter
  const byTerm = new Map();
  for (const r of out) {
    const key = (r.term || '').toLowerCase();
    if (!key) continue;
    if (!byTerm.has(key)) byTerm.set(key, r);
    else {
      const old = byTerm.get(key);
      const better =
        (r.prio ?? 1) < (old.prio ?? 1) ||
        ((r.prio ?? 1) === (old.prio ?? 1) &&
          (r.term?.length ?? 1e9) < (old.term?.length ?? 1e9));
      if (better) byTerm.set(key, r);
    }
  }

  // Sort by: acronym hits first, then word length
  return [...byTerm.values()].sort((a, b) => {
    const pa = a.prio ?? 1;
    const pb = b.prio ?? 1;
    if (pa !== pb) return pa - pb;
    return (a.term?.length ?? 0) - (b.term?.length ?? 0);
  });
}

/** Calculate the payload that "query q" should return (consistent with /glossary/detail) */
async function computeGlossaryPayload(pool, q) {
  let results = [];
  const exact = await exactHit(pool, q);
  if (exact) results = [exact];
  else if (isLikelyPrefix(q)) results = await prefixRaw(pool, q);
  if (!results.length) return null;
  return results.map(toPayload);
}

export default function initGlossaryRoutes(pool) {
  const router = Router();
  /**
   * @openapi
   * /api/glossary/detail:
   *   get:
   *     tags: [Glossary]
   *     summary: Get glossary detail(s) by term/acronym or by prefix
   *     x-summary-zh: 按术语/缩写或前缀查询术语表
   *     description: |
   *       Returns glossary detail(s) for a given query **q**.  
   *       - If `q` exactly matches a term or acronym, returns a **single item**.  
   *       - If `q` looks like a letter prefix (A–Z, length 1–50), returns **multiple items** with that prefix.  
   *       - Results are cached. When cache is warm, this endpoint serves without touching the database.
   *     x-description-zh: |
   *       根据查询参数 **q** 返回术语表结果：  
   *       - 若 `q` 精确匹配术语或缩写，返回**单条**；  
   *       - 若 `q` 是 1–50 位的字母前缀（A–Z），返回**多条**此前缀的匹配项；  
   *       - 结果支持缓存，命中缓存时可**零数据库查询**。
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: Term/acronym for exact match, or a letter prefix (e.g., "u", "vet").
   *         x-description-zh: 术语/缩写用于精确匹配，或字母前缀（如 "u"、"vet"）用于前缀匹配。
   *     responses:
   *       200:
   *         description: Array of glossary item(s).
   *         x-description-zh: 术语项数组。
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/GlossaryItem'
   *             examples:
   *               exact:
   *                 summary: Exact match (single item)
   *                 x-summary-zh: 精确匹配（单条）
   *                 value:
   *                   - { "term": "Aboriginal and Torres Strait Islander Commission", "description": "", "acronym": "ATSIC", "also_called": [], "see_also": [] }
   *               prefix:
   *                 summary: Prefix match (multiple items)
   *                 x-summary-zh: 前缀匹配（多条）
   *                 value:
   *                   - { "term": "Adult basic education", "description": "", "acronym": "ABE", "also_called": [], "see_also": [] }
   *                   - { "term": "Apprenticeship", "description": "", "acronym": "", "also_called": [], "see_also": [] }
   *       400:
   *         description: Missing or invalid query parameter `q`.
   *         x-description-zh: 缺少或非法的查询参数 `q`。
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   *             examples:
   *               missing_q:
   *                 value: { "message": "missing query parameter: q" }
   *       404:
   *         description: No glossary found for the given query.
   *         x-description-zh: 未找到匹配的术语。
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/ErrorResponse' }
   *             examples:
   *               not_found:
   *                 value: { "message": "No glossary found for: abcxyz" }
   *       500:
   *         description: Internal server error.
   *         x-description-zh: 服务器内部错误。
   */
  router.get('/glossary/detail', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) return res.status(400).json({ message: 'missing query parameter: q' });

      const cacheKey = `glossary:${q.toLowerCase()}`;
      const TTL_SEC = 600;

      // Check cache first (cache.js will return parsed JSON)
      const cached = await cache.get(cacheKey);
      if (cached) return res.json(cached);

      // Miss → single-flight calculation and write to cache
      // Miss → single-flight calculation and write to cache
      const payload = await withSingleFlight(cacheKey, TTL_SEC, async () => {
        const data = await computeGlossaryPayload(pool, q);
        // Return an empty array when no result is found; it will be cached as [], making subsequent hits faster
        return Array.isArray(data) ? data : [];
      });


      return res.json(payload);
    } catch (e) {
      // if (e?.code === 404) {
      //   return res.status(404).json({ message: `No glossary found for: ${req.query.q}` });
      // }
      console.error('[glossary/detail] error:', e);
      return res.status(500).json({ message: 'internal error' });
    }
  });

  /**
 * @openapi
 * /api/admin/glossary/prewarm:
 *   post:
 *     tags: [Admin]
 *     summary: Prewarm Redis cache for glossary exact & prefix queries
 *     x-summary-zh: 预热术语表的精确与前缀查询缓存
 *     description: |
 *       Scans `word_data` and `acronyms` to generate Redis entries for:  
 *       - **Exact keys**: for each term/acronym (optionally also full form)  
 *       - **Prefix keys**: letter prefixes up to `maxPrefixLen` (default 3)  
 *       Supports TTL, concurrency, dry-run, and only-miss modes.
 *     x-description-zh: |
 *       扫描 `word_data` 与 `acronyms`，为以下查询预先写入 Redis：  
 *       - **精确键**：每个术语/缩写（可含 full form）；  
 *       - **前缀键**：按字母前缀生成（长度至 `maxPrefixLen`，默认 3）；  
 *       支持 TTL、并发、试运行与仅补充未命中等模式。
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ttlSec:
 *                 type: integer
 *                 default: 600
 *                 description: Cache TTL in seconds.
 *                 x-description-zh: 缓存过期时间（秒）。
 *               concurrency:
 *                 type: integer
 *                 default: 4
 *                 minimum: 1
 *                 maximum: 8
 *                 description: Number of concurrent workers (1–8).
 *                 x-description-zh: 并发 worker 数（1–8）。
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Compute and list keys without writing to Redis.
 *                 x-description-zh: 只计算与列举，不实际写入 Redis。
 *               onlyMiss:
 *                 type: boolean
 *                 default: true
 *                 description: Write only when the key is missing.
 *                 x-description-zh: 仅在键未命中时写入。
 *               maxPrefixLen:
 *                 type: integer
 *                 default: 3
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Maximum prefix length for prefix keys.
 *                 x-description-zh: 前缀键的最大长度。
 *           examples:
 *             default:
 *               summary: Default options
 *               x-summary-zh: 默认参数
 *               value: { "ttlSec": 600, "concurrency": 4, "dryRun": false, "onlyMiss": true, "maxPrefixLen": 3 }
 *             dry_run:
 *               summary: Dry-run without writing
 *               x-summary-zh: 试运行（不写入）
 *               value: { "dryRun": true }
 *     responses:
 *       200:
 *         description: Summary of prewarm execution.
 *         x-description-zh: 预热执行结果摘要。
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     ttlSec: { type: integer }
 *                     concurrency: { type: integer }
 *                     dryRun: { type: boolean }
 *                     onlyMiss: { type: boolean }
 *                     maxPrefixLen: { type: integer }
 *                     counts:
 *                       type: object
 *                       properties:
 *                         exact: { type: integer, description: "Exact keys count", x-description-zh: 精确键数量 }
 *                         prefix: { type: integer, description: "Prefix keys count", x-description-zh: 前缀键数量 }
 *                         totalKeys: { type: integer, description: "Total keys processed", x-description-zh: 处理键总数 }
 *                         wrote: { type: integer, description: "Keys written", x-description-zh: 实际写入数量 }
 *                         skipped_hit: { type: integer, description: "Skipped due to existing hits", x-description-zh: 因命中而跳过 }
 *                         skipped_dry: { type: integer, description: "Skipped due to dry-run", x-description-zh: 因试运行而跳过 }
 *                         errors: { type: integer, description: "Error count", x-description-zh: 错误数量 }
 *                     sample:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           key: { type: string }
 *                           wrote: { type: boolean }
 *                           skipped: { type: string }
 *                           error: { type: string }
 *             examples:
 *               sample:
 *                 summary: Example summary
 *                 x-summary-zh: 示例摘要
 *                 value:
 *                   ok: true
 *                   summary:
 *                     ttlSec: 600
 *                     concurrency: 4
 *                     dryRun: false
 *                     onlyMiss: true
 *                     maxPrefixLen: 3
 *                     counts:
 *                       exact: 3200
 *                       prefix: 850
 *                       totalKeys: 4050
 *                       wrote: 3980
 *                       skipped_hit: 60
 *                       skipped_dry: 0
 *                       errors: 10
 *                     sample:
 *                       - { "key": "glossary:ai", "wrote": true }
 *                       - { "key": "glossary:atsic", "skipped": "HIT" }
 *       401:
 *         description: Unauthorized (missing or invalid x-admin-secret).
 *         x-description-zh: 未授权（缺少或错误的 x-admin-secret）。
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               unauthorized:
 *                 value: { "error": "unauthorized" }
 *       500:
 *         description: Internal server error.
 *         x-description-zh: 服务器内部错误。
 */
  router.post('/admin/glossary/prewarm', async (req, res) => {
    try {
      const adminSecret = process.env.ADMIN_SECRET;
      if (adminSecret && req.headers['x-admin-secret'] !== adminSecret) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const TTL_SEC = Math.max(60, Number(req.body?.ttlSec ?? 600));
      const CONCURRENCY = Math.max(1, Math.min(8, Number(req.body?.concurrency ?? 4)));
      const DRY_RUN = !!req.body?.dryRun;
      const ONLY_MISS = !!req.body?.onlyMiss;
      const MAX_PREFIX_LEN = Math.max(1, Math.min(5, Number(req.body?.maxPrefixLen ?? 3)));


      const conn = await pool.getConnection();
      let words = [], acrs = [];
      try {
        const [w] = await conn.query(`
          SELECT wd.word AS term, wd.description, wd.acronym, wd.also_called, wd.see_also
          FROM word_data wd
        `);
        const [a] = await conn.query(`SELECT acronym, full_form FROM acronyms`);
        words = Array.isArray(w) ? w : [];
        acrs = Array.isArray(a) ? a : [];
      } finally {
        conn.release();
      }

      const termSet = new Set();
      const acSet = new Set();
      for (const r of words) {
        const t = String(r.term || '').trim();
        if (t) termSet.add(t);
        const ac = String(r.acronym || '').trim();
        if (ac) acSet.add(ac);
      }
      for (const a of acrs) {
        const ac = String(a.acronym || '').trim();
        const ff = String(a.full_form || '').trim();
        if (ff) termSet.add(ff);
        if (ac) acSet.add(ac);
      }


      const toPrefixes = s => {
        const v = String(s || '').trim();
        if (!/^[A-Za-z]+$/.test(v)) return [];
        const arr = [];
        const L = Math.min(MAX_PREFIX_LEN, v.length);
        for (let i = 1; i <= L; i++) arr.push(v.slice(0, i));
        return arr;
      };

      const exactQs = new Set([...termSet, ...acSet]);
      const prefixQs = new Set();
      for (const t of termSet) toPrefixes(t).forEach(p => prefixQs.add(p.toLowerCase()));
      for (const a of acSet) toPrefixes(a).forEach(p => prefixQs.add(p.toLowerCase()));

      // Unify the key list after deduplication
      const keys = [
        ...[...exactQs].map(q => ({ q, key: `glossary:${q.toLowerCase()}` })),
        ...[...prefixQs].map(q => ({ q, key: `glossary:${q}` })),
      ];

      const results = [];
      let idx = 0;
      const worker = async () => {
        while (idx < keys.length) {
          const cur = keys[idx++];
          try {
            if (DRY_RUN) { results.push({ key: cur.key, skipped: 'DRY_RUN' }); continue; }
            if (ONLY_MISS) {
              const hit = await cache.get(cur.key);
              if (hit) { results.push({ key: cur.key, skipped: 'HIT' }); continue; }
            }
            // Calculate a payload that is exactly the same as /glossary/detail and write it to the cache using withSingleFlight
            await withSingleFlight(cur.key, TTL_SEC, async () => {
              const data = await computeGlossaryPayload(pool, cur.q);
              // If empty, do not write to the cache (return null so that the caller can also see it)
              if (!data) return [];
              return data;
            });
            results.push({ key: cur.key, wrote: true });
          } catch (e) {
            results.push({ key: cur.key, error: e?.message || String(e) });
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      const summary = {
        ttlSec: TTL_SEC,
        concurrency: CONCURRENCY,
        dryRun: DRY_RUN,
        onlyMiss: ONLY_MISS,
        maxPrefixLen: MAX_PREFIX_LEN,
        counts: {
          exact: exactQs.size,
          prefix: prefixQs.size,
          totalKeys: keys.length,
          wrote: results.filter(r => r.wrote).length,
          skipped_hit: results.filter(r => r.skipped === 'HIT').length,
          skipped_dry: results.filter(r => r.skipped === 'DRY_RUN').length,
          errors: results.filter(r => r.error).length,
        },
        sample: results.slice(0, 10),
      };
      return res.json({ ok: true, summary });
    } catch (err) {
      console.error('[/admin/glossary/prewarm] error:', err);
      return res.status(500).json({ error: 'internal_error' });
    }
  });

  return router;
}
