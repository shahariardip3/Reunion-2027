import { NextResponse } from "next/server";

export const json = (data, status = 200, headers) => NextResponse.json(data, { status, headers });
export const fail = (error, status = 400, extra = {}) => json({ error, ...extra }, status);

/**
 * Reports a database failure: logs the real error on the server (visible in the terminal / Vercel logs)
 * and returns a short error code. `admin: true` also returns Supabase's message (admin-only routes).
 */
export function dbFail(label, message, error, { status = 500, admin = false } = {}) {
  console.error(`[${label}]`, error?.code || "", error?.message || error || "");
  const body = { error: message };
  if (error?.code) body.code = String(error.code);
  if (admin && error?.message) body.detail = String(error.message).slice(0, 300);
  return json(body, status);
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isMissingColumn = (e) => e && (e.code === "42703" || e.code === "PGRST204");
