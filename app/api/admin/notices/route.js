import { db } from "../../../../lib/supabase";
import { isMainAdmin } from "../../../../lib/auth";
import { writeAudit } from "../../../../lib/audit-log";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";

async function guard(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  return rateLimit(req, "admin-notices", 40, 60);
}

async function save(req, isUpdate) {
  const denied = await guard(req); if (denied) return denied;
  const b = await req.json().catch(() => null);
  if (!b) return fail("Invalid request.");
  const fields = [b.title_bn, b.title_en, b.body_bn, b.body_en];
  if (!fields.every((v) => typeof v === "string" && v.trim())) return fail("Both languages need a title and notice body.");
  if ([b.title_bn, b.title_en].some((v) => v.length > 140) || [b.body_bn, b.body_en].some((v) => v.length > 5000)) return fail("Notice is too long.");
  if (b.expires_at && !/^\d{4}-\d{2}-\d{2}$/.test(b.expires_at)) return fail("Invalid expiry date.");
  if (isUpdate && !UUID_RE.test(String(b.id))) return fail("Invalid notice ID.");

  const payload = {
    title_bn: b.title_bn.trim(), title_en: b.title_en.trim(), body_bn: b.body_bn.trim(), body_en: b.body_en.trim(),
    published: b.published === true, pinned: b.pinned === true, expires_at: b.expires_at || null,
  };
  const table = db().from("notices");
  const { data, error } = isUpdate
    ? await table.update({ ...payload, updated_at: new Date().toISOString() }).eq("id", b.id).select("id").maybeSingle()
    : await table.insert(payload).select("id").single();
  if (error) return dbFail("notices", "Could not save the notice.", error, { admin: true });
  if (!data) return fail("Notice not found.", 404);
  await writeAudit(isUpdate ? "notice_updated" : "notice_created", null, { notice_id: data.id });
  return json({ ok: true, id: data.id });
}

export const POST = (req) => save(req, false);
export const PATCH = (req) => save(req, true);

export async function DELETE(req) {
  const denied = await guard(req); if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  if (!UUID_RE.test(String(b.id))) return fail("Invalid notice ID.");
  const { error } = await db().from("notices").delete().eq("id", b.id);
  if (error) return dbFail("notices:delete", "Could not delete the notice.", error, { admin: true });
  await writeAudit("notice_deleted", null, { notice_id: b.id });
  return json({ ok: true });
}
