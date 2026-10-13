const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

function getTransport() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'CampusHub <noreply@campushub.local>';
  const mail = { from, to, subject, html, text: text || html.replace(/<[^>]+>/g, ' ') };
  const tx = getTransport();
  if (!tx) {
    logger.info(`[email:dev] to=${to} subject=${subject}`);
    return { queued: true, mocked: true };
  }
  try {
    await tx.sendMail(mail);
    return { queued: true };
  } catch (err) {
    logger.error('Email send failed', err.message);
    return { queued: false, error: err.message };
  }
}

function branded(title, body) {
  const name = process.env.INSTITUTION_NAME || 'CampusHub';
  return {
    html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5eaf0;border-radius:12px;overflow:hidden">
      <div style="background:#0f4c81;color:#fff;padding:16px 20px;font-size:18px">${name}</div>
      <div style="padding:20px;color:#1c2434"><h2 style="margin-top:0">${title}</h2><p>${body}</p></div>
      <div style="padding:12px 20px;background:#f4f7fb;color:#667;font-size:12px">This is an automated message from CampusHub.</div>
    </div>`,
    text: `${title}\n\n${body.replace(/<[^>]+>/g, '')}`
  };
}

module.exports = { sendEmail, branded, getTransport };
