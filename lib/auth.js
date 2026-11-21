import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE = "admin";
const TTL = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SECRET || "";
  if (value.length < 32) throw new Error("ADMIN_SECRET must contain at least 32 characters.");
  return value;
}
function signature(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}
export function makeToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TTL, nonce: crypto.randomBytes(24).toString("base64url") })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
function safeEqual(a, b) {
  const x = Buffer.from(a || ""), y = Buffer.from(b || "");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function isAdminPasswordConfigured() {
  const expected = process.env.ADMIN_PASSWORD || "";
  return expected.length >= 16;
}
export function isAdminAuthConfigured() {
  return isAdminPasswordConfigured() && (process.env.ADMIN_SECRET || "").length >= 32;
}
export function passwordOk(password) {
  const expected = process.env.ADMIN_PASSWORD || "";
  return isAdminPasswordConfigured() && typeof password === "string" && safeEqual(password, expected);
}
export async function isAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE)?.value || "";
    const [payload, sig, extra] = token.split(".");
    if (!payload || !sig || extra || !safeEqual(sig, signature(payload))) return false;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(parsed.exp) && parsed.exp > Math.floor(Date.now() / 1000) && typeof parsed.nonce === "string";
  } catch { return false; }
}
export const adminCookieOptions = {
  httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
  path: "/", maxAge: TTL,
};
