// backend/backend/validators/contact.schema.js
import { z } from 'zod';

export const ContactSchema = z.object({
  // 允许匿名：name/email 可选
  name: z.string().trim().min(0).max(100).optional(),
  email: z.string().trim().email().max(200).optional(),
  category: z.string().trim().min(1).max(100), // 前端下拉必选
  message: z.string().trim().min(1).max(5000),
  agree: z.boolean().optional(), // 是否勾选同意
  // 预留元信息（来源页面、语言、设备等）
  meta: z.object({
    source: z.string().max(50).optional(),
    page: z.string().max(200).optional(),
    locale: z.string().max(20).optional()
  }).optional()
});
