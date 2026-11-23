import { db } from "../../../../lib/supabase";
import { isMainAdmin, hashAdminPassword, verifyMainReauth } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";
import { writeAudit } from "../../../../lib/audit-log";

export async function GET() {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const { data, error } = await db().from("admin_users").select("id,username,display_name,is_active,created_at").order("created_at");
  if (error) return dbFail("subadmins:list", "Could not load Sub Admins.", error, { admin: true });
  return json({ users: data || [] }, 200, { "Cache-Control": "no-store" });
}
export async function POST(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "subadmin-write", 20, 60); if (limited) return limited;
  const b = await req.json().catch(() => ({}));
  const username = String(b.username || "").trim().toLowerCase();
  const displayName = String(b.display_name || "").trim();
  const password = String(b.password || "");
  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) return fail("Username must be 3–32 characters (a-z, 0-9, dot, underscore or hyphen).");
  if (displayName.length < 2 || displayName.length > 80) return fail("Display name must be 2–80 characters.");
  if (password.length < 10 || password.length > 128) return fail("Sub Admin password must be at least 10 characters.");
  const sb = db();
  const { data: newId, error } = await sb.rpc("create_subadmin", {
    p_username: username, p_display_name: displayName, p_password_hash: hashAdminPassword(password),
  });
  if (error) {
    if (error.code === "23505") return fail("Username already exists.", 409);
    if (String(error.message || "").includes("MAX_SUBADMINS")) return fail("Maximum 5 Sub Admin accounts are allowed.", 409);
    return dbFail("subadmins:create", "Could not create Sub Admin. Run the latest supabase/schema.sql.", error, { admin: true });
  }
  const { data, error: readError } = await sb.from("admin_users").select("id,username,display_name,is_active,created_at").eq("id", newId).single();
  if (readError) return dbFail("subadmins:read", "Sub Admin was created, but could not be loaded.", readError, { admin: true });
  await writeAudit("subadmin_created", null, { username, display_name: displayName });
  return json({ user: data });
}
export async function DELETE(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "subadmin-write", 20, 60); if (limited) return limited;
  const b = await req.json().catch(() => ({}));
  if (typeof b.id !== "string" || !UUID_RE.test(b.id)) return fail("Invalid Sub Admin ID.");
  if (!verifyMainReauth(b.main_password)) return fail("Main Admin password re-authentication failed.", 403);
  const { data: user, error: readError } = await db().from("admin_users").select("id,username,display_name").eq("id", b.id).maybeSingle();
  if (readError || !user) return fail("Sub Admin not found.", 404);
  const { error } = await db().from("admin_users").delete().eq("id", b.id);
  if (error) return dbFail("subadmins:delete", "Could not delete Sub Admin.", error, { admin: true });
  await writeAudit("subadmin_deleted", null, { username: user.username, display_name: user.display_name });
  return json({ ok: true });
}
