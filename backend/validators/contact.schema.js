// validators/contact.schema.js
import { z } from 'zod';

/**
 * Normalize empty strings "" and whitespace-only strings to undefined, making optionals easier to pass
 */
const emptyToUndef = (v) => {
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
};

export const ContactSchema = z.object({
  // Optional: Verify if passed; an empty string will be treated as not provided
  name: z.preprocess(
    emptyToUndef,
    z.string().trim().max(100, 'name too long').optional()
  ),

  // Optional: Verify if passed; an empty string will be treated as not provided
  email: z.preprocess(
    emptyToUndef,
    z.string().trim().email('Invalid email').max(200).optional()
  ),

  // Required
  category: z.string().trim().min(1, 'category required').max(100),
  message: z.string().trim().min(1, 'message required').max(5000),

  // Optional (whether to check contact permission/privacy consent); if mandatory consent is required, it can be changed to required boolean()
  agree: z.boolean().optional(),

  // Optional: meta
  meta: z.object({
    source: z.preprocess(emptyToUndef, z.string().max(50).optional()),
    page: z.preprocess(emptyToUndef, z.string().max(200).optional()),
    locale: z.preprocess(emptyToUndef, z.string().max(20).optional())
  }).optional()
});
