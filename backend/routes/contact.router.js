// routes/contact.router.js
import express from "express";
import rateLimit from "express-rate-limit";
import { ContactSchema } from "../validators/contact.schema.js";
import { sendFeedbackMail } from "../services/mailer.service.js";

const router = express.Router();

// Up to 5 times per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @openapi
 * /api/contact:
 *   post:
 *     tags: [Feedback]
 *     summary: Submit feedback form (JSON) and forward it to a fixed mailbox
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, agree]
 *             properties:
 *               name:
 *                 type: string
 *                 nullable: true
 *                 example: "TE17"
 *                 description: Optional display name
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *                 example: "te17@example.com"
 *                 description: Optional contact email
 *               category:
 *                 type: string
 *                 nullable: true
 *                 example: "Bug report"
 *               message:
 *                 type: string
 *                 example: "Describe the issue..."
 *               agree:
 *                 type: boolean
 *                 example: true
 *               meta:
 *                 type: object
 *                 nullable: true
 *                 properties:
 *                   source: { type: string, example: "web" }
 *                   page:   { type: string, example: "/feedback" }
 *                   ua:     { type: string, example: "Mozilla/5.0 ..." }
 *                   ip:     { type: string, example: "203.0.113.*" }
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
router.post("/contact", limiter, async (req, res) => {
  try {
    const data = ContactSchema.parse(req.body);
    const id = await sendFeedbackMail(data);
    return res.json({ ok: true, id });
  } catch (err) {

    if (err?.issues) {
      return res
        .status(400)
        .json({ ok: false, error: "BadRequest", detail: err.issues });
    }
    console.error("[contact] send failed:", err);
    return res.status(500).json({ ok: false, error: "SendFailed" });
  }
});

export default router;
