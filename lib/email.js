import tls from "node:tls";
import { db } from "./supabase";
import { siteUrl } from "./site";

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
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
    const wrap = (v) => Buffer.from(String(v), "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") || "";
    const message = [
      `From: Reunion 2027 <${cfg.user}>`,
      `To: <${to}>`,
      `Subject: ${encodedSubject}`,
      "MIME-Version: 1.0",
      'Content-Type: multipart/alternative; boundary="reunion2027_boundary"',
      "",
      "--reunion2027_boundary",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrap(text),
      "--reunion2027_boundary",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrap(html),
      "--reunion2027_boundary--",
      "",
    ].join("\r\n").replace(/^\./gm, "..");
    socket.write(message + "\r\n.\r\n");
    await expect([250]);
    await command("QUIT", [221]).catch(() => {});
  } finally {
    socket.end();
  }
}

function cardUrl(regCode, trxId) {
  const base = siteUrl();
  if (!base) throw new Error("SITE_URL must be set to send a working ID-card link.");
  return `${base}/card?reg=${encodeURIComponent(regCode)}&trx=${encodeURIComponent(trxId)}`;
}

function mailContent({ type, name, regCode, trxId }) {
  const approved = type === "approved";
  const url = cardUrl(regCode, trxId);
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(regCode);
  const safeTrx = escapeHtml(trxId);
  const title = approved ? "Your Reunion 2027 registration is approved" : "Your Reunion 2027 registration has been received";
  const status = approved ? "Your registration has been approved. You can now download your ID card." : "We have received your registration. It is pending admin verification. After approval, use the same link to download your ID card.";
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172033;line-height:1.6"><h2>Ganganandapur High School — Reunion 2027</h2><p>Hello ${safeName},</p><p>${status}</p><div style="padding:16px;background:#f3f5f8;border-radius:10px"><p><b>Registration Number:</b> ${safeCode}</p><p><b>Transaction ID:</b> ${safeTrx}</p><p><b>Status:</b> ${approved ? "Approved" : "Received — Pending"}</p></div><p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 18px;background:#173f73;color:#fff;text-decoration:none;border-radius:7px">Open / Download ID Card</a></p><p>Keep this email and your registration details safe.</p><p>Regards,<br>Reunion 2027 Team</p></div>`;
  const plain = `Ganganandapur High School Reunion 2027\n\nHello ${name},\n${status}\nRegistration Number: ${regCode}\nTransaction ID: ${trxId}\nStatus: ${approved ? "Approved" : "Received — Pending"}\nID Card: ${url}\n\nKeep this email safe.\nReunion 2027 Team`;
  return { subject: title, html, text: plain };
}

export async function sendRegistrationEmail(registration) {
  return sendLoggedEmail(registration, "registered");
}
export async function sendApprovalEmail(registration) {
  return sendLoggedEmail(registration, "approved");
}
async function sendLoggedEmail(registration, type) {
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
    const content = mailContent({ type, name: registration.full_name, regCode: registration.reg_code, trxId: registration.trx_id });
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

export async function retryEmailLog(id) {
  const sb = db();
  const { data: log, error } = await sb.from("email_logs").select("*, registrations(*)").eq("id", id).maybeSingle();
  if (error || !log) throw new Error("Email log not found.");
  const reg = log.registrations;
  if (!reg?.email) throw new Error("Registration email is unavailable.");
  const result = log.email_type === "approved" ? await sendApprovalEmail(reg) : await sendRegistrationEmail(reg);
  if (result.sent) {
    await sb.from("email_logs").update({ status: "sent", sent_at: new Date().toISOString(), error_message: "Successfully resent." }).eq("id", id);
  }
  return result;
}
