import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

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
export function makeToken(session = { role: "main", username: "main", name: "Main Admin" }) {
  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + TTL,
    nonce: crypto.randomBytes(24).toString("base64url"),
    role: session.role === "sub" ? "sub" : "main",
    username: String(session.username || "main").slice(0, 40),
    name: String(session.name || "Main Admin").slice(0, 80),
    userId: session.userId || null,
    authVersion: session.role === "sub" ? String(session.credentialVersion || "") : authVersion("main", process.env.ADMIN_PASSWORD),
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
/** Keyed fingerprint of a credential. Unlike a bare SHA-256, it cannot be used to test password guesses offline
 * even if a session cookie is read, because it needs ADMIN_SECRET. Changing the password/secret invalidates sessions. */
function authVersion(kind, value) {
  return crypto.createHmac("sha256", secret()).update(`${kind}:${String(value || "")}`).digest("hex");
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
export function hashAdminPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}
export function verifyAdminPasswordHash(password, stored) {
  try {
    const [kind, salt, expected] = String(stored || "").split("$");
    if (kind !== "scrypt" || !salt || !expected) return false;
    const actual = crypto.scryptSync(String(password || ""), salt, 64).toString("base64url");
    return safeEqual(actual, expected);
  } catch { return false; }
}
export async function verifySubAdmin(username, password) {
  const normalized = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalized) || typeof password !== "string" || password.length < 8) return null;
  const { data, error } = await db().from("admin_users")
    .select("id,username,display_name,password_hash,is_active")
    .eq("username", normalized).eq("is_active", true).maybeSingle();
  if (error || !data || !verifyAdminPasswordHash(password, data.password_hash)) return null;
  return { role: "sub", username: data.username, name: data.display_name || data.username, userId: data.id, credentialVersion: authVersion("sub", data.password_hash) };
}
export async function persistAdminSession(token, session) {
  const payload = token.split(".")[0];
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const { error } = await db().from("admin_sessions").insert({
    session_id: parsed.nonce, username: session.username || "main", role: session.role || "main",
    admin_user_id: session.userId || null,
    expires_at: new Date(parsed.exp * 1000).toISOString(), last_seen_at: new Date().toISOString(),
  });
  if (error) throw new Error("Could not create secure admin session: " + error.message);
  return token;
}
export async function revokeAdminSession(token) {
  try {
    const payload = String(token || "").split(".")[0];
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.nonce) await db().from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("session_id", parsed.nonce).is("revoked_at", null);
  } catch {}
}
export async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE)?.value || "";
    const [payload, sig, extra] = token.split(".");
    if (!payload || !sig || extra || !safeEqual(sig, signature(payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isInteger(parsed.exp) || parsed.exp <= Math.floor(Date.now() / 1000) || typeof parsed.nonce !== "string") return null;
    if (!["main", "sub"].includes(parsed.role)) return null;
    if (parsed.role === "main" && (typeof parsed.authVersion !== "string" || !safeEqual(parsed.authVersion, authVersion("main", process.env.ADMIN_PASSWORD)))) return null;
    const { data: activeSession, error: sessionError } = await db().from("admin_sessions")
      .select("session_id,revoked_at,expires_at,last_seen_at").eq("session_id", parsed.nonce).maybeSingle();
    if (sessionError || !activeSession || activeSession.revoked_at || new Date(activeSession.expires_at).getTime() <= Date.now()) return null;
    const staleSeenAt = new Date(Date.now() - 60_000).toISOString();
    await db().from("admin_sessions").update({ last_seen_at: new Date().toISOString() }).eq("session_id", parsed.nonce).lt("last_seen_at", staleSeenAt);
    if (parsed.role === "sub") {
      if (!parsed.userId) return null;
      const { data: activeUser, error } = await db().from("admin_users").select("id,is_active,username,password_hash").eq("id", parsed.userId).maybeSingle();
      const currentVersion = activeUser?.password_hash ? authVersion("sub", activeUser.password_hash) : "";
      if (error || !activeUser?.is_active || activeUser.username !== parsed.username || !parsed.authVersion || !safeEqual(String(parsed.authVersion), currentVersion)) return null;
    }
    return { role: parsed.role, username: parsed.username || "", name: parsed.name || "", userId: parsed.userId || null };
  } catch { return null; }
}
export async function isAdmin() { return !!(await getAdminSession()); }
export async function isMainAdmin() { return (await getAdminSession())?.role === "main"; }
export async function isSubAdmin() { return (await getAdminSession())?.role === "sub"; }
export function verifyMainReauth(password) { return passwordOk(password); }

export const adminCookieOptions = {
  httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
  path: "/", maxAge: TTL,
};
