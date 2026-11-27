import { db } from "../../../../lib/supabase";
import { isMainAdmin } from "../../../../lib/auth";
import { writeAudit } from "../../../../lib/audit-log";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";

async function guard(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  return rateLimit(req, "admin-history", 40, 60);
}

async function save(req, isUpdate) {
  const denied = await guard(req); if (denied) return denied;
  const b = await req.json().catch(() => null);
  if (!b) return fail("Invalid request.");
  const year = Number(b.year);
  if (!Number.isInteger(year) || year < 1940 || year > 2027) return fail("Year must be between 1940 and 2027.");
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const title_bn = str(b.title_bn), title_en = str(b.title_en), body_bn = str(b.body_bn), body_en = str(b.body_en);
  if (!title_bn || !title_en) return fail("Both languages need a title.");
  if (title_bn.length > 140 || title_en.length > 140 || body_bn.length > 1000 || body_en.length > 1000) return fail("Text is too long.");
  const sort_order = Number.isInteger(Number(b.sort_order)) ? Math.max(-1000, Math.min(1000, Number(b.sort_order))) : 0;
  if (isUpdate && !UUID_RE.test(String(b.id))) return fail("Invalid event ID.");

  const payload = { year, title_bn, title_en, body_bn, body_en, sort_order, published: b.published !== false };
  const table = db().from("history_events");
  const { data, error } = isUpdate
    ? await table.update({ ...payload, updated_at: new Date().toISOString() }).eq("id", b.id).select("id").maybeSingle()
    : await table.insert(payload).select("id").single();
  if (error) return dbFail("history", "Could not save the timeline event.", error, { admin: true });
  if (!data) return fail("Event not found.", 404);
  await writeAudit(isUpdate ? "history_updated" : "history_created", null, { event_id: data.id, year });
  return json({ ok: true, id: data.id });
}

export const POST = (req) => save(req, false);
export const PATCH = (req) => save(req, true);

export async function DELETE(req) {
  const denied = await guard(req); if (denied) return denied;
  const b = await req.json().catch(() => ({}));
  if (!UUID_RE.test(String(b.id))) return fail("Invalid event ID.");
  const { error } = await db().from("history_events").delete().eq("id", b.id);
  if (error) return dbFail("history:delete", "Could not delete the event.", error, { admin: true });
  await writeAudit("history_deleted", null, { event_id: b.id });
  return json({ ok: true });
}
