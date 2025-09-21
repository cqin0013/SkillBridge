// anzsco.training.router.js
import express from 'express';

export default function initAnzscoTrainingRoutes(pool) {
  const router = express.Router();

  /**
   * GET /api/anzsco/:code/training-advice?limit=10
   * - 去重：DISTINCT(vet_course_code, vet_course_name)
   * - 排序：按课程名升序
   * - 返回 total（与 DISTINCT 口径一致）
   */
/**
 * @openapi
 * /api/anzsco/{code}/training-advice:
 *   get:
 *     tags: [ANZSCO]
 *     summary: Get VET training courses by ANZSCO
 *     x-summary-zh: 按 ANZSCO 获取 VET 培训课程
 *     description: Return distinct VET courses mapped from an ANZSCO code. Supports paging via `limit`.
 *     x-description-zh: 根据 ANZSCO 代码返回去重后的 VET 课程列表，支持 `limit` 分页。
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, pattern: '^[0-9]{6}$' }
 *         description: 6-digit ANZSCO code.
 *         x-description-zh: 6 位 ANZSCO 代码。
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 50 }
 *         description: Max items to return (1..50).
 *         x-description-zh: 返回条数上限（1..50）。
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingAdviceResponse'
 */


  router.get('/:code/training-advice', async (req, res) => {
    const code  = req.params.code?.trim();
    const limit = Math.min(parseInt(req.query.limit ?? '10', 10) || 10, 50); // 上限 50
    if (!code) return res.status(400).json({ error: 'anzsco_code required' });

    const conn = await pool.getConnection();
    try {
      // 1) 校验 ANZSCO 是否存在（体验更好）
      const [[anz]] = await conn.query(
        `SELECT anzsco_code, anzsco_title
           FROM anzsco_data
          WHERE anzsco_code = ?`,
        [code]
      );
      if (!anz) return res.status(404).json({ error: 'ANZSCO code not found' });

      // 2) total（与下面 DISTINCT 口径一致）
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

      // 3) 实际列表 —— DISTINCT + 排序 + limit
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
