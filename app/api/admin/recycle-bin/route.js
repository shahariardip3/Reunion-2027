import { db } from "../../../../lib/supabase";
import { isMainAdmin, verifyMainReauth } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";
import { writeAudit } from "../../../../lib/audit-log";

export async function GET() {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const { data, error } = await db().from("registration_trash")
    .select("id,original_id,registration_data,deleted_by,deleted_at")
    .order("deleted_at", { ascending: false }).limit(200);
  if (error) return dbFail("recycle-bin:list", "Could not load Recycle Bin.", error, { admin: true });
  return json({ items: data || [] }, 200, { "Cache-Control": "no-store" });
}
export async function POST(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "recycle-bin", 30, 60); if (limited) return limited;
  const b = await req.json().catch(() => ({}));
  if (typeof b.id !== "string" || !UUID_RE.test(b.id)) return fail("Invalid Recycle Bin item ID.");
  if (!verifyMainReauth(b.main_password)) return fail("Main Admin password re-authentication failed.", 403);
  const sb = db();
  const { data: item, error: readError } = await sb.from("registration_trash").select("*").eq("id", b.id).maybeSingle();
  if (readError || !item) return fail("Recycle Bin item not found.", 404);
  const row = item.registration_data || {};
  if (b.action === "restore") {
    const { error } = await sb.from("registrations").insert(row);
    if (error) return error.code === "23505" ? fail("Cannot restore: a registration with the same ID, TrxID or registration number already exists.", 409) : dbFail("recycle-bin:restore", "Could not restore registration.", error, { admin: true });
    const { error: deleteError } = await sb.from("registration_trash").delete().eq("id", item.id);
    if (deleteError) return dbFail("recycle-bin:restore-cleanup", "Registration restored, but Recycle Bin cleanup failed.", deleteError, { admin: true });
    await writeAudit("registration_restored", row, { recycle_bin_id: item.id });
    return json({ ok: true });
  }
  if (b.action === "permanent_delete") {
    if (row.photo_path) {
      const { error: photoError } = await sb.storage.from("photos").remove([row.photo_path]);
      if (photoError) return dbFail("recycle-bin:photo-delete", "Could not permanently delete registration photo.", photoError, { admin: true });
    }
    const { error } = await sb.from("registration_trash").delete().eq("id", item.id);
    if (error) return dbFail("recycle-bin:permanent-delete", "Could not permanently delete registration.", error, { admin: true });
    await writeAudit("registration_permanently_deleted", row, { recycle_bin_id: item.id });
    return json({ ok: true });
  }
  return fail("Invalid Recycle Bin action.");
}
