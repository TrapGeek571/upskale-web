const fetch = global.fetch || require("node-fetch");

let nodemailer = null;
let twilio = null;
try {
  nodemailer = require("nodemailer");
} catch (e) {
  // nodemailer not installed or not available
}
try {
  twilio = require("twilio");
} catch (e) {
  // twilio not installed
}

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+1415xxxx

const WHATSAPP_CLOUD_TOKEN = process.env.WHATSAPP_CLOUD_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

async function sendEmailNotification({ to, subject, text, html }) {
  if (nodemailer && SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      const info = await transporter.sendMail({
        from: process.env.NOTIFY_FROM || SMTP_USER,
        to,
        subject,
        text,
        html,
      });
      return { ok: true, info };
    } catch (err) {
      console.error("Email send failed:", err);
      return { ok: false, error: err.message };
    }
  }

  console.log(
    "Email notification disabled or not configured. Would send to:",
    to,
  );
  return { ok: false, error: "disabled" };
}

async function sendWhatsAppNotification({ toPhone, message }) {
  // Try Twilio first
  if (
    twilio &&
    TWILIO_ACCOUNT_SID &&
    TWILIO_AUTH_TOKEN &&
    TWILIO_WHATSAPP_FROM
  ) {
    try {
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      const msg = await client.messages.create({
        from: TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${toPhone}`,
        body: message,
      });
      return { ok: true, info: msg };
    } catch (err) {
      console.error("Twilio WhatsApp send failed:", err);
      return { ok: false, error: err.message };
    }
  }

  // Try WhatsApp Cloud API (Meta) if configured
  if (WHATSAPP_CLOUD_TOKEN && WHATSAPP_PHONE_ID) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v15.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WHATSAPP_CLOUD_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: toPhone,
            type: "text",
            text: { body: message },
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(data));
      return { ok: true, info: data };
    } catch (err) {
      console.error("WhatsApp Cloud send failed:", err);
      return { ok: false, error: err.message };
    }
  }

  console.log(
    "WhatsApp notification disabled or not configured. Would send to:",
    toPhone,
  );
  return { ok: false, error: "disabled" };
}

module.exports = {
  sendEmailNotification,
  sendWhatsAppNotification,
};
