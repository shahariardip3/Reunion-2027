import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "./supabase";

/** Hosts this site may legitimately be served from (request host + optional SITE_URL). */
function allowedHosts(req) {
  const hosts = new Set();
  for (const h of [req.headers.get("x-forwarded-host"), req.headers.get("host")]) {
    if (h) hosts.add(h.split(",")[0].trim().toLowerCase());
  }
  try { if (process.env.SITE_URL) hosts.add(new URL(process.env.SITE_URL).host.toLowerCase()); } catch {}
  return hosts;
}

export function sameOrigin(req) {
  try {
    const origin = req.headers.get("origin");
    if (origin) return allowedHosts(req).has(new URL(origin).host.toLowerCase());
    const site = req.headers.get("sec-fetch-site");
    return site === "same-origin" || site === "none";
  } catch { return false; }
}

export function csrfGuard(req) {
  if (sameOrigin(req)) return null;
  return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
}

export async function rateLimit(req, scope, limit, windowSeconds) {
  const ip = req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const key = crypto.createHash("sha256").update(`${scope}:${ip}`).digest("hex");
  let data, error;
  try {
    ({ data, error } = await db().rpc("consume_rate_limit", {
      p_key_hash: key, p_limit: limit, p_window_seconds: windowSeconds,
    }));
  } catch (e) {
    console.error("[rate-limit] Supabase client unavailable:", e?.message || e);
    return NextResponse.json({ error: "Supabase is not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart the server." }, { status: 503 });
  }
  if (error || data === null || data === undefined) {
    console.error("[rate-limit]", error?.code || "", error?.message || "no data returned");
    return NextResponse.json({ error: "Security rate-limit database setup is incomplete. Run supabase/schema.sql in the Supabase SQL Editor, then try again.", code: error?.code ? String(error.code) : undefined }, { status: 503 });
  }
  if (!data.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, {
      status: 429, headers: { "Retry-After": String(data.retry_after || windowSeconds) },
    });
  }
  return null;
}

export function validImageSignature(buffer, mime) {
  if (mime === "image/jpeg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/webp") return buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}
