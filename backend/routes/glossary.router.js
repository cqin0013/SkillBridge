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

/** Search for a term in word_data / acronyms; supports searching by "term" or "abbreviation" */
async function findGlossaryRecord(pool, q) {
  // 1) First directly hit word_data (by term or abbreviation)
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

  // 2) If no match: look for a mapping in acronyms (abbreviation -> full name, or full name -> abbreviation)
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

  // 3) Use full_form to check word_data again (many definitions are in word_data)
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
    // If acronym is not filled in word_data, then fill in the acronyms table
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

export default function initGlossaryRoutes(pool) {
  const router = Router();

  /**
   * @openapi
   * /api/glossary/detail:
   *   get:
   *     tags: [Glossary]
   *     summary: Get glossary detail by term or acronym
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema: { type: string }
   *         description: Term (e.g., "Unique Student Identifier") or acronym (e.g., "USI / VETDSS")
   *     responses:
   *       200: { description: OK }
   *       400: { description: Missing q }
   *       404: { description: Not found }
   */
  router.get('/glossary/detail', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ message: 'missing query parameter: q' });

    try {
      const row = await findGlossaryRecord(pool, q);
      if (!row) return res.status(404).json({ message: `No glossary found for: ${q}` });

      const payload = {
        term: row.term || '',
        description: row.description || '',
        acronym: row.acronym || undefined,
        also_called: splitList(row.also_called),
        see_also: splitList(row.see_also),
      };
      return res.json(payload);
    } catch (e) {
      console.error('[glossary/detail] error:', e);
      return res.status(500).json({ message: 'internal error' });
    }
  });

  return router;
}
