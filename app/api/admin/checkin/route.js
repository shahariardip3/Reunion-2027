import { db } from "../../../../lib/supabase";
import { isAdmin } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";

const CODE_RE = /^REU-\d{4,8}$/;

export async function POST(req) {
  if (!(await isAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-checkin", 120, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));

  // A registration can be found by its QR token (UUID) or by the printed registration ID (REU-0001).
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  let field, value;
  if (UUID_RE.test(token)) { field = "checkin_token"; value = token; }
  else if (CODE_RE.test(code)) { field = "reg_code"; value = code; }
  else return fail("Invalid QR code.");

  const sb = db();
  if (body.action === "verify") {
    const { data, error } = await sb.from("registrations")
      .select("id,full_name,ssc_batch,profession,reg_code,status,attended_at").eq(field, value).maybeSingle();
    if (error) return dbFail("checkin:verify", "Could not verify the QR code.", error, { status: 503, admin: true });
    if (!data) return fail("QR code not found.", 404);
    if (data.status !== "approved") return fail("This registration is not approved.", 409);
    return json({ ok: true, registration: data, already_attended: !!data.attended_at }, 200, { "Cache-Control": "no-store" });
  }

  if (body.action === "attend") {
    const { data, error } = await sb.from("registrations")
      .update({ attended_at: new Date().toISOString(), attended_by: "admin" })
      .eq(field, value).eq("status", "approved").is("attended_at", null)
      .select("id,full_name,ssc_batch,reg_code,attended_at").maybeSingle();
    if (error) return dbFail("checkin:attend", "Could not mark attendance.", error, { admin: true });
    if (data) return json({ ok: true, registration: data });
    const { data: existing } = await sb.from("registrations").select("attended_at").eq(field, value).maybeSingle();
    if (existing?.attended_at) return fail("Already marked as attended.", 409, { already_attended: true, attended_at: existing.attended_at });
    return fail("Approved registration not found.", 404);
  }
  return fail("Invalid check-in action.");
}
