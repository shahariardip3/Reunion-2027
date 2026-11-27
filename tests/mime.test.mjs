import test from "node:test";
import assert from "node:assert/strict";
import { buildMimeMessage } from "../lib/mime.js";

const base = { from: "reunion@example.com", to: "a@b.co", subject: "স্বাগতম", text: "hello", html: "<p>hello</p>" };

test("message has Date, Message-ID and MIME headers", () => {
  const m = buildMimeMessage({ ...base, now: new Date("2027-01-02T03:04:05Z"), id: "abc", boundary: "BND" });
  assert.match(m, /^From: Reunion 2027 <reunion@example\.com>\r\n/);
  assert.match(m, /\r\nDate: Sat, 02 Jan 2027 03:04:05 \+0000\r\n/);
  assert.match(m, /\r\nMessage-ID: <abc@example\.com>\r\n/);
  assert.match(m, /boundary="BND"/);
  assert.ok(m.includes("--BND--"));
});

test("subject is RFC 2047 encoded and bodies are base64", () => {
  const m = buildMimeMessage(base);
  const subject = m.split("\r\n").find((l) => l.startsWith("Subject:"));
  const encoded = subject.match(/=\?UTF-8\?B\?(.+)\?=/)[1];
  assert.equal(Buffer.from(encoded, "base64").toString("utf8"), "স্বাগতম");
  assert.ok(m.includes(Buffer.from("hello").toString("base64")));
});

test("boundary is random per message", () => {
  const b = (m) => m.match(/boundary="([^"]+)"/)[1];
  assert.notEqual(b(buildMimeMessage(base)), b(buildMimeMessage(base)));
});
