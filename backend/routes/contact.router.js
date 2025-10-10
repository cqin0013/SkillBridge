// backend/backend/routes/contact.router.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { ContactSchema } from '../validators/contact.schema.js';
import { sendFeedbackMail } from '../services/mailer.service.js';

const router = express.Router();

// 每 IP 每分钟至多 5 次（可按需调整）
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @openapi
 * /contact:
 *   post:
 *     tags: [Feedback]
 *     summary: Submit feedback form (JSON) and forward it to a fixed mailbox
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:     { type: string, example: "Your name" }
 *               email:    { type: string, example: "you@example.com" }
 *               category: { type: string, example: "Bug report" }
 *               message:  { type: string, example: "Describe the issue..." }
 *               agree:    { type: boolean, example: true }
 *               meta:
 *                 type: object
 *                 properties:
 *                   source: { type: string, example: "web" }
 *                   page:   { type: string, example: "/feedback" }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 id: { type: string }
 *       400: { description: Bad request }
 *       429: { description: Too many requests }
 *       500: { description: Send failed }
 */
router.post('/contact', limiter, async (req, res) => {
  try {
    const data = ContactSchema.parse(req.body);
    const id = await sendFeedbackMail(data);
    return res.json({ ok: true, id });
  } catch (err) {
    // zod 校验错误
    if (err?.issues) {
      return res.status(400).json({ ok: false, error: 'BadRequest', detail: err.issues });
    }
    console.error('[contact] send failed:', err);
    return res.status(500).json({ ok: false, error: 'SendFailed' });
  }
});

export default router;
