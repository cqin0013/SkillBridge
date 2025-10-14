// services/mailer.service.js
import nodemailer from 'nodemailer';

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_USER,
  SMTP_PASS,
  MAIL_TO = '',
  MAIL_SUBJECT_PREFIX = '[Feedback]'
} = process.env;

// Recipient list: comma separated
const RECIPIENTS = MAIL_TO.split(',').map(s => s.trim()).filter(Boolean);

if (RECIPIENTS.length === 0) {
  console.warn('[mailer] WARN: MAIL_TO is empty – no recipient configured.');
}

// nodemailer transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: String(SMTP_PORT) === '465', // 465 SMTPS，587 走 STARTTLS
  auth: (SMTP_USER && SMTP_PASS) ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

/**
 * Set Reply-To only if a valid email exists
 */
function buildReplyTo(email) {
  if (typeof email === 'string' && email.includes('@')) {
    return email;
  }
  return undefined;
}

/**
 * 
 */
function escapeHtml(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * 
 * @param {{name?: string, email?: string, category: string, message: string, meta?: any}} param0
 * @returns {Promise<string|null>} messageId
 */
export async function sendFeedbackMail({ name, email, category, message, meta }) {
  const displayName = (name && name.trim()) ? name.trim() : 'Anonymous';
  const hasEmail = !!(email && email.trim());

  const subject =
    `${MAIL_SUBJECT_PREFIX} ${category || 'General'} - ${displayName}` +
    (hasEmail ? '' : ' [Anonymous]');

  const lines = [
    `Category: ${category || '(none)'}`,
    `Name: ${displayName}`,
    `Email: ${hasEmail ? email : '(not provided)'}`,
    '',
    'Message:',
    message || '',
    '',
    meta ? `Meta: ${JSON.stringify(meta)}` : undefined
  ].filter(Boolean);

  const mail = {

    from: SMTP_USER ? `"Feedback Bot" <${SMTP_USER}>` : undefined,
    to: RECIPIENTS,
    subject,
    replyTo: buildReplyTo(email),
    text: lines.join('\n'),
    html: `
      <div>
        <p><b>Category:</b> ${escapeHtml(category || '(none)')}</p>
        <p><b>Name:</b> ${escapeHtml(displayName)}</p>
        <p><b>Email:</b> ${escapeHtml(hasEmail ? email : '(not provided)')}</p>
        ${meta ? `<p><b>Meta:</b> <code>${escapeHtml(JSON.stringify(meta))}</code></p>` : ''}
        <hr/>
        <pre style="white-space:pre-wrap;font-family:ui-monospace,Consolas,Menlo,monospace">${escapeHtml(message || '')}</pre>
      </div>
    `
  };

  const info = await transporter.sendMail(mail);
  return info?.messageId || null;
}
