import crypto from "node:crypto";

const b64 = (v) => Buffer.from(String(v), "utf8").toString("base64");
const wrap = (v) => b64(v).match(/.{1,76}/g)?.join("\r\n") || "";

/**
 * Builds a complete RFC 5322 message (without the SMTP "." terminator).
 * Adds Date and Message-ID headers (missing headers are a common spam signal) and a random MIME boundary.
 */
export function buildMimeMessage({ from, fromName = "Reunion 2027", to, subject, text, html, now = new Date(), id = crypto.randomUUID(), boundary = `=_reunion_${crypto.randomBytes(12).toString("hex")}` }) {
  const domain = String(from).split("@")[1] || "localhost";
  const message = [
    `From: ${fromName} <${from}>`,
    `To: <${to}>`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${now.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${id}@${domain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrap(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
  // SMTP dot-stuffing: a line that starts with "." must be doubled.
  return message.replace(/^\./gm, "..");
}
