import { createClient } from "@supabase/supabase-js";

let cached = null;

/** Describes the configured key without exposing it: legacy JWT role, or the new sb_* key types. */
export function describeKey(key = process.env.SUPABASE_SERVICE_ROLE_KEY || "") {
  if (!key) return { type: "missing", ok: false };
  if (key.startsWith("sb_secret_")) return { type: "secret", ok: true };
  if (key.startsWith("sb_publishable_")) return { type: "publishable", ok: false };
  if (key.startsWith("eyJ")) {
    try {
      const role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role;
      return { type: `jwt:${role}`, ok: role === "service_role" };
    } catch { return { type: "jwt:unknown", ok: false }; }
  }
  return { type: "unknown", ok: false };
}

/** Server-only Supabase client (service role). Never import this from a client component. */
export function db() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  const info = describeKey(key);
  if (!info.ok) console.warn(`[supabase] The configured key looks like "${info.type}", not a service_role / secret key. Writes will fail.`);
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
