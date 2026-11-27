import { NextResponse } from "next/server";
import { db } from "../../../../lib/supabase";
import { getAdminSession } from "../../../../lib/auth";
import { csrfGuard } from "../../../../lib/security";
import { fail } from "../../../../lib/http";
export async function GET() {
  const session = await getAdminSession();
  if (!session || session.role !== "main") return fail("Only Main Admin can manage sessions.", 403);
  const { data, error } = await db().from("admin_sessions").select("session_id,username,role,admin_user_id,created_at,last_seen_at,expires_at,revoked_at").order("created_at", { ascending: false }).limit(100);
  if (error) return fail("Could not load sessions. Apply the v8 database migration.", 503);
  return NextResponse.json({ sessions: data || [] });
}
export async function DELETE(req) {
  const session = await getAdminSession();
  if (!session || session.role !== "main") return fail("Only Main Admin can revoke sessions.", 403);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const body = await req.json().catch(() => ({}));
  if (typeof body.session_id !== "string" || !/^[a-zA-Z0-9_-]{20,80}$/.test(body.session_id)) return fail("Invalid session ID.");
  const { error } = await db().from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("session_id", body.session_id).is("revoked_at", null);
  if (error) return fail("Could not revoke session.", 503);
  return NextResponse.json({ ok: true });
}
