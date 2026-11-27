import tls from "node:tls";
import { db } from "./supabase";
import { siteUrl } from "./site";
import { buildMimeMessage } from "./mime";

const clean = (v) => String(v || "").trim();
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function smtpConfig() {
  const user = clean(process.env.GMAIL_USER);
  const pass = clean(process.env.GMAIL_APP_PASSWORD).replace(/\s/g, "");
  if (!user || !pass || !emailRe.test(user)) throw new Error("Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  return { user, pass, host: clean(process.env.SMTP_HOST) || "smtp.gmail.com", port: Number(process.env.SMTP_PORT || 465) };
}

async function smtpSend({ to, subject, html, text }) {
  const cfg = smtpConfig();
  if (!emailRe.test(to)) throw new Error("Recipient email address is invalid.");
  const socket = tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host });
  socket.setEncoding("utf8");
  socket.setTimeout(8000, () => socket.destroy(new Error("Gmail SMTP connection timed out.")));
  let buffer = "";
  let waiters = [];
  let responses = [];
  let closedError = null;
  socket.on("data", (chunk) => {
    buffer += chunk;
    while (true) {
      const end = buffer.indexOf("\r\n");
      if (end < 0) break;
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      if (/^\d{3} /.test(line)) {
        const waiter = waiters.shift();
        if (waiter) waiter.resolve(line);
        else responses.push(line);
      }
    }
  });
  socket.on("error", (e) => { closedError = e; for (const w of waiters.splice(0)) w.reject(e); });
  socket.on("close", () => { if (!closedError) closedError = new Error("SMTP connection closed."); for (const w of waiters.splice(0)) w.reject(closedError); });
  const response = () => new Promise((resolve, reject) => {
    if (closedError) return reject(closedError);
    if (responses.length) return resolve(responses.shift());
    waiters.push({ resolve, reject });
  });
  const expect = async (codes) => {
    const line = await response();
    if (!codes.includes(Number(line.slice(0, 3)))) throw new Error(`Gmail SMTP error: ${line.slice(0, 300)}`);
    return line;
  };
  const command = async (line, codes) => { socket.write(line + "\r\n"); return expect(codes); };
  try {
    await new Promise((resolve, reject) => {
      socket.once("secureConnect", resolve);
      socket.once("error", reject);
    });
    await expect([220]);
    await command("EHLO reunion2027.local", [250]);
    await command("AUTH LOGIN", [334]);
    await command(Buffer.from(cfg.user).toString("base64"), [334]);
    await command(Buffer.from(cfg.pass).toString("base64"), [235]);
    await command(`MAIL FROM:<${cfg.user}>`, [250]);
    await command(`RCPT TO:<${to}>`, [250, 251]);
    await command("DATA", [354]);
    const message = buildMimeMessage({ from: cfg.user, to, subject, text, html });
    socket.write(message + "\r\n.\r\n");
    await expect([250]);
    await command("QUIT", [221]).catch(() => {});
  } finally {
    socket.end();
  }
}

function cardUrl(cardToken, baseUrl = "") {
  const base = String(baseUrl || siteUrl() || "").replace(/\/+$/, "");
  if (!base) throw new Error("SITE_URL must be set to send a working ID-card link.");
  if (!cardToken) throw new Error("Registration has no card token. Run the latest supabase/schema.sql.");
  // A random token – the link no longer contains the TrxID or phone, so a forwarded e-mail leaks far less.
  return `${base}/card?t=${encodeURIComponent(cardToken)}`;
}

function mailContent({ type, name, regCode, trxId, cardToken, baseUrl }) {
  const approved = type === "approved";
  const url = approved ? cardUrl(cardToken, baseUrl) : null;
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(regCode);
  const safeTrx = escapeHtml(trxId);
  const title = approved ? "Your Reunion 2027 registration is approved" : "Your Reunion 2027 registration has been received";
  const status = approved ? "Your registration has been approved. You can now download your ID card." : "We have received your registration. It is pending admin verification. After approval, use the same link to download your ID card.";
  const idBlock = approved ? `<p><b>Registration Number:</b> ${safeCode}</p><p><a href="${escapeHtml(url)}">Open / Download ID Card</a></p>` : `<p>Your registration number will be assigned after approval.</p>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033;line-height:1.6"><h2>Ganganandapur High School — Reunion 2027</h2><p>Hello ${safeName},</p><p>${status}</p><div style="padding:16px;background:#f3f5f8;border-radius:10px">${idBlock}<p><b>Transaction ID:</b> ${safeTrx}</p><p><b>Status:</b> ${approved ? "Approved" : "Received — Pending"}</p></div><p>Keep this email and your registration details safe.</p><p>Regards,<br>Reunion 2027 Team</p></div>`;
  const plain = `Ganganandapur High School Reunion 2027\n\nHello ${name},\n${status}\n${approved ? `Registration Number: ${regCode}\nID Card: ${url}\n` : "Registration number will be assigned after approval.\n"}Transaction ID: ${trxId}\nStatus: ${approved ? "Approved" : "Received — Pending"}\n\nKeep this email safe.\nReunion 2027 Team`;
  return { subject: title, html, text: plain };
}

export async function sendRegistrationEmail(registration, opts = {}) {
  return sendLoggedEmail(registration, "registered", opts);
}
export async function sendApprovalEmail(registration, opts = {}) {
  return sendLoggedEmail(registration, "approved", opts);
}
async function sendLoggedEmail(registration, type, { baseUrl = "" } = {}) {
  const recipient = clean(registration.email).toLowerCase();
  if (!recipient) return { sent: false, skipped: true, reason: "No email address on this registration." };
  const subject = type === "approved" ? "Your Reunion 2027 registration is approved" : "Your Reunion 2027 registration has been received";
  const sb = db();
  const { data: log, error: logError } = await sb.from("email_logs").insert({
    registration_id: registration.id,
    recipient,
    email_type: type,
    subject,
    status: "sending",
  }).select("id").single();
  if (logError) console.error("[email:log-insert]", logError.message);

  try {
    const content = mailContent({ type, name: registration.full_name, regCode: registration.reg_code, trxId: registration.trx_id, cardToken: registration.card_token, baseUrl });
    await smtpSend({ to: recipient, ...content });
    if (log?.id) await sb.from("email_logs").update({ status: "sent", sent_at: new Date().toISOString(), error_message: null }).eq("id", log.id);
    return { sent: true };
  } catch (e) {
    const message = String(e?.message || "Email sending failed.").slice(0, 500);
    if (log?.id) await sb.from("email_logs").update({ status: "failed", error_message: message }).eq("id", log.id);
    console.error("[email:send]", message);
    return { sent: false, error: message };
  }
}

export async function retryEmailLog(id, opts = {}) {
  const sb = db();
  const { data: log, error } = await sb.from("email_logs").select("*, registrations(*)").eq("id", id).maybeSingle();
  if (error || !log) throw new Error("Email log not found.");
  const reg = log.registrations;
  if (!reg?.email) throw new Error("Registration email is unavailable.");
  // A retry is a new delivery attempt. Keep the original failed row intact so
  // the history remains an honest audit trail; sendLoggedEmail creates a new row.
  return log.email_type === "approved" ? sendApprovalEmail(reg, opts) : sendRegistrationEmail(reg, opts);
}

/** Atomically claims and delivers one queued message. Safe for immediate
 * registration/approval sends and the scheduled worker to race each other. */
export async function processEmailOutboxJob(jobId, opts = {}) {
  const sb = db();
  const now = new Date().toISOString();
  const { data: job, error: readError } = await sb.from("email_outbox")
    .select("id,registration_id,email_type,attempts")
    .eq("id", jobId).eq("status", "queued").lte("available_at", now).maybeSingle();
  if (readError) return { sent: false, error: "Could not read queued email." };
  if (!job) return { sent: false, skipped: true, reason: "Email is not due or has already been claimed." };

  const attempts = Number(job.attempts || 0) + 1;
  const { data: claimed, error: claimError } = await sb.from("email_outbox")
    .update({ status: "processing", attempts, locked_at: now })
    .eq("id", job.id).eq("status", "queued").select("id").maybeSingle();
  if (claimError) return { sent: false, error: "Could not claim queued email." };
  if (!claimed) return { sent: false, skipped: true, reason: "Another worker claimed this email." };

  const { data: reg, error: regError } = await sb.from("registrations").select("*").eq("id", job.registration_id).maybeSingle();
  const result = !regError && reg?.email
    ? (job.email_type === "approved" ? await sendApprovalEmail(reg, opts) : await sendRegistrationEmail(reg, opts))
    : { sent: false, error: "Registration/email not found." };

  if (result.sent) {
    const { error: updateError } = await sb.from("email_outbox").update({
      status: "sent", sent_at: new Date().toISOString(), locked_at: null, last_error: null,
    }).eq("id", job.id);
    if (updateError) console.error("[email:outbox-mark-sent]", updateError.message);
    return { ...result, outboxUpdated: !updateError };
  }

  const terminal = attempts >= 5;
  const delaySeconds = Math.min(86400, 60 * (2 ** Math.min(attempts, 10)));
  const { error: updateError } = await sb.from("email_outbox").update({
    status: terminal ? "failed" : "queued",
    available_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
    locked_at: null,
    last_error: String(result.error || "Email delivery failed.").slice(0, 500),
  }).eq("id", job.id);
  if (updateError) console.error("[email:outbox-mark-failed]", updateError.message);
  return { ...result, outboxUpdated: !updateError };
}
