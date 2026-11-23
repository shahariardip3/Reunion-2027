export const runtime = "nodejs";
import { db } from "../../../../lib/supabase";
import { isMainAdmin } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";
import { retryEmailLog } from "../../../../lib/email";

export async function GET() {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const { data, error } = await db().from("email_logs")
    .select("id,recipient,email_type,subject,status,error_message,created_at,sent_at,registrations(full_name,reg_code)")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return dbFail("email-history", "Could not load email history.", error, { admin: true });
  return json({ logs: data || [] }, 200, { "Cache-Control": "no-store" });
}

export async function POST(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-email-retry", 10, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return fail("Invalid email log ID.");
  try {
    const result = await retryEmailLog(body.id);
    return json({ ok: true, sent: result.sent === true });
  } catch (e) {
    return fail(String(e?.message || "Could not retry email.").slice(0, 250), 400);
  }
}
