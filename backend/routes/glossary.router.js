// glossary.router.js
import { Router } from 'express';

/** Split into string array */
function splitList(v) {
  if (!v || typeof v !== 'string') return [];
  return v
    .split(/[,;|；，、]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

/** 前缀搜索输入判断：只含字母，1~50 长度 */
function isLikelyPrefix(q) {
  return /^[A-Za-z]+$/.test(q) && q.length >= 1 && q.length <= 50;
}

/** 统一格式化为接口对象 */
function toPayload(row) {
  return {
    term: row.term || '',
    description: row.description || '',
    acronym: row.acronym || undefined,
    also_called: splitList(row.also_called),
    see_also: splitList(row.see_also),
  };
}

/** 精确命中（返回单条或 null） */
async function exactHit(pool, q) {
  // 1) word_data 精确
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

  // 2) acronyms 精确 -> 回填 word_data
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

  // word_data 没有定义时，给占位对象
  return {
    term: full_form,
    description: null,
    acronym: acronym || null,
    also_called: null,
    see_also: null,
  };
}

/** 前缀匹配，聚合 word_data 与 acronyms，去重后返回多条 */
async function prefixHits(pool, q) {
  const like = `${q}%`;

  // A) word_data 前缀匹配（优先 acronym，再 word）
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

  // B) acronyms 前缀匹配（可能映射到 word_data，也可能没有定义）
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

  // 将 acronyms 的 full_form 尝试回填为 word_data 定义
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
      // 没有定义也生成占位
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

  // 去重：按 term 去重（保留优先级更高/更短者）
  const byTerm = new Map();
  for (const r of out) {
    const key = (r.term || '').toLowerCase();
    if (!key) continue;
    if (!byTerm.has(key)) {
      byTerm.set(key, r);
    } else {
      const old = byTerm.get(key);
      const better =
        (r.prio ?? 1) < (old.prio ?? 1) ||
        ((r.prio ?? 1) === (old.prio ?? 1) &&
          (r.term?.length ?? 1e9) < (old.term?.length ?? 1e9));
      if (better) byTerm.set(key, r);
    }
  }

  // 排序：优先 acronym 命中，再按词长
  const merged = [...byTerm.values()].sort((a, b) => {
    const pa = a.prio ?? 1;
    const pb = b.prio ?? 1;
    if (pa !== pb) return pa - pb;
    return (a.term?.length ?? 0) - (b.term?.length ?? 0);
  });

  return merged;
}

export default function initGlossaryRoutes(pool, redis /* 可选 */) {
  const router = Router();

  /**
   * @openapi
   * /api/glossary/detail:
   *   get:
   *     tags: [Glossary]
   *     summary: Get glossary detail(s) by term/acronym or by prefix
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema: { type: string }
   *         description: Full term/acronym (exact) or a letter prefix (e.g., "u", "vet")
   *     responses:
   *       200: { description: OK (array) }
   *       400: { description: Missing q }
   *       404: { description: Not found }
   */
  router.get('/glossary/detail', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ message: 'missing query parameter: q' });

    const cacheKey = `glossary:${q.toLowerCase()}`;

    try {
      // 先查缓存
      if (redis && typeof redis.get === 'function') {
        const cached = await redis.get(cacheKey);
        if (cached) {
          try {
            const arr = JSON.parse(cached);
            return res.json(arr);
          } catch { /* ignore bad cache */ }
        }
      }

      let results = [];

      // 1) 先尝试精确命中
      const exact = await exactHit(pool, q);
      if (exact) {
        results = [exact];
      } else {
        // 2) 无精确 → 若像前缀则拉全量前缀命中
        if (isLikelyPrefix(q)) {
          results = await prefixHits(pool, q);
        }
      }

      if (!results.length) {
        return res.status(404).json({ message: `No glossary found for: ${q}` });
      }

      const payloadArray = results.map(toPayload);

      // 写缓存
      if (redis && typeof redis.setEx === 'function') {
        await redis.setEx(cacheKey, 600, JSON.stringify(payloadArray));
      } else if (redis && typeof redis.set === 'function') {
        try { await redis.set(cacheKey, JSON.stringify(payloadArray), 'EX', 600); } catch {}
      }

      return res.json(payloadArray);
    } catch (e) {
      console.error('[glossary/detail] error:', e);
      return res.status(500).json({ message: 'internal error' });
    }
  });

  return router;
}
