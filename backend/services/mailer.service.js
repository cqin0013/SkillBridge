// backend/backend/services/mailer.service.js
import nodemailer from 'nodemailer';

const {
  SMTP_HOST, SMTP_PORT = '587', SMTP_USER, SMTP_PASS,
  MAIL_TO = '', MAIL_SUBJECT_PREFIX = '[Feedback]'
} = process.env;

if (!MAIL_TO) {
  console.warn('[mailer] WARN: MAIL_TO is empty – no recipient configured.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: parseInt(SMTP_PORT, 10),
  secure: SMTP_PORT === '465',
  auth: (SMTP_USER && SMTP_PASS) ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
});

export async function sendFeedbackMail({ name, email, category, message, meta }) {
  const subject = `${MAIL_SUBJECT_PREFIX} ${category}`;
  const lines = [
    `Category: ${category}`,
    name ? `Name: ${name}` : `Name: (anonymous)`,
    email ? `Email: ${email}` : `Email: (not provided)`,
    '',
    'Message:',
    message,
    '',
    meta ? `Meta: ${JSON.stringify(meta)}` : undefined
  ].filter(Boolean);

  const mail = {
    from: SMTP_USER ? `"${name || 'Feedback Bot'}" <${SMTP_USER}>` : undefined,
    to: MAIL_TO,
    subject,
    replyTo: email || undefined,
    text: lines.join('\n'),
    html: `
      <div>
        <p><b>Category:</b> ${escapeHtml(category)}</p>
        <p><b>Name:</b> ${escapeHtml(name || '(anonymous)')}</p>
        <p><b>Email:</b> ${escapeHtml(email || '(not provided)')}</p>
        ${meta ? `<p><b>Meta:</b> <code>${escapeHtml(JSON.stringify(meta))}</code></p>` : ''}
        <hr/>
        <pre style="white-space:pre-wrap;font-family:ui-monospace,Consolas,Menlo,monospace">${escapeHtml(message)}</pre>
      </div>
    `
  };

  const info = await transporter.sendMail(mail);
  return info?.messageId || null;
}

function escapeHtml(s = '') {
  return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}
