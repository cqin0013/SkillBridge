import express from 'express';

export default function initAnzscoTrainingRoutes(pool) {
  const router = express.Router();

  /**
   * GET /api/anzsco/:code/training-advice?limit=10
   * - Deduplication：DISTINCT(vet_course_code, vet_course_name)
   */
  /**
   * @openapi
   * /api/anzsco/{code}/training-advice:
   *   get:
   *     tags: [ANZSCO]
   *     summary: List VET courses linked to an ANZSCO 6-digit code
   *     description: |
   *       Returns **distinct** VET courses associated with the given **ANZSCO 6-digit code**,
   *       alphabetically ordered by course name. Also includes a **total** count for pagination/"show more".
   *     x-summary-zh: 按 ANZSCO 六位 code 返回关联的 VET 课程（去重+按名排序）
   *     x-description-zh: |
   *       返回与指定 **ANZSCO 六位 code** 关联的 **去重** VET 课程，并按课程名排序。
   *       同时返回 **total** 以便前端分页或“还有更多”提示。
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema: { type: string, pattern: '^[0-9]{6}$' }
   *         description: ANZSCO 6-digit code.
   *       - in: query
   *         name: limit
   *         required: false
   *         schema: { type: integer, default: 10, minimum: 1, maximum: 100 }
   *         description: Limit number of courses returned.
   *     responses:
   *       200:
   *         description: Courses found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/TrainingAdviceResponse'
   *             examples:
   *               sample:
   *                 value:
   *                   anzsco: { code: "531111", title: "Clerk" }
   *                   total: 128
   *                   vet_courses:
   *                     - { vet_course_code: "BSB20112", course_name: "Certificate II in Business" }
   *                     - { vet_course_code: "AUR20105", course_name: "Certificate II in Automotive Administration" }
   *       400:
   *         description: Invalid ANZSCO code
   *       404:
   *         description: ANZSCO not found
   *       500:
   *         description: Server error
   */
  router.get('/:code/training-advice', async (req, res) => {
    const code = req.params.code?.trim();
    const limit = Math.min(parseInt(req.query.limit ?? '10', 10) || 10, 50); // 上限 50
    if (!code) return res.status(400).json({ error: 'anzsco_code required' });

    const conn = await pool.getConnection();
    try {
      // 1 Check if ANZSCO exists
      const [[anz]] = await conn.query(
        `SELECT anzsco_code, anzsco_title
           FROM anzsco_data
          WHERE anzsco_code = ?`,
        [code]
      );
      if (!anz) return res.status(404).json({ error: 'ANZSCO code not found' });

      // 2 total
      const [[{ total }]] = await conn.query(
        `
        SELECT COUNT(*) AS total
        FROM (
          SELECT DISTINCT
                 v.vet_course_code,
                 v.vet_course_name
            FROM anzsco_vet_course_data av
            JOIN vet_course_data v
              ON v.vet_course_code = av.vet_course_code
           WHERE av.anzsco_code = ?
        ) AS dedup
        `,
        [code]
      );

      // 3 Actual list - DISTINCT + sort + limit
      const [vetRows] = await conn.query(
        `
        SELECT DISTINCT
               v.vet_course_code,
               v.vet_course_name AS course_name
          FROM anzsco_vet_course_data av
          JOIN vet_course_data v
            ON v.vet_course_code = av.vet_course_code
         WHERE av.anzsco_code = ?
         ORDER BY v.vet_course_name
         LIMIT ?
        `,
        [code, limit]
      );

      return res.json({
        anzsco: { code: anz.anzsco_code, title: anz.anzsco_title },
        total,
        vet_courses: vetRows
      });
    } catch (e) {
      console.error('training-advice error:', e);
      return res.status(500).json({ error: 'internal_error' });
    } finally {
      conn.release();
    }
  });

  return router;
}
