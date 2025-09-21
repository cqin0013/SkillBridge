// anzsco.training.router.js  —— 覆盖整个文件
import express from 'express';

export default function initAnzscoTrainingRoutes(pool) {
  const router = express.Router();

  // GET /api/anzsco/:code/training-advice?limit=10
  router.get('/:code/training-advice', async (req, res) => {
    const code = req.params.code?.trim();
    const limit = Math.min(parseInt(req.query.limit ?? '10', 10), 50);
    if (!code) return res.status(400).json({ error: 'anzsco_code required' });

    const conn = await pool.getConnection();
    try {
      // 校验 code 是否存在（可选）
      const [[anz]] = await conn.query(
        `SELECT anzsco_code, anzsco_title
           FROM anzsco_data
          WHERE anzsco_code = ?`,
        [code]
      );
      if (!anz) return res.status(404).json({ error: 'ANZSCO code not found' });

      // 课程建议（列名是 vet_course_name）
      const [vetRows] = await conn.query(
        `SELECT v.vet_course_code,
                v.vet_course_name AS course_name
           FROM anzsco_vet_course_data av
           JOIN vet_course_data v
             ON v.vet_course_code = av.vet_course_code
          WHERE av.anzsco_code = ?
          ORDER BY v.vet_course_name
          LIMIT ?`,
        [code, limit]
      );

      res.json({
        anzsco: { code: anz.anzsco_code, title: anz.anzsco_title },
        vet_courses: vetRows
      });
    } catch (e) {
      console.error('training-advice error:', e);
      res.status(500).json({ error: 'internal_error' });
    } finally {
      conn.release();
    }
  });

  return router;
}
