export const runtime = "nodejs";
import { db } from "../../../../lib/supabase";
import { isMainAdmin } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";
import { after } from "next/server";
import { retryEmailLog, processEmailOutboxJob } from "../../../../lib/email";
import { requestOrigin } from "../../../../lib/site";

export async function GET() {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const sb = db();
  const [{ data: logs, error: logError }, { data: queued, error: queueError }] = await Promise.all([
    sb.from("email_logs")
      .select("id,registration_id,recipient,email_type,subject,status,error_message,created_at,sent_at,registrations(full_name,reg_code)")
      .order("created_at", { ascending: false }).limit(100),
    sb.from("email_outbox")
      .select("id,registration_id,email_type,status,attempts,available_at,last_error,created_at,sent_at,registrations(full_name,email,reg_code)")
      .in("status", ["queued", "processing", "failed"])
      .order("created_at", { ascending: false }).limit(100),
  ]);
  if (logError) return dbFail("email-history:logs", "Could not load email sending history.", logError, { admin: true });
  if (queueError) return dbFail("email-history:outbox", "Could not load pending email queue history. Apply the latest database schema.", queueError, { admin: true });

  const attempted = (logs || []).map((row) => ({ ...row, source: "log" }));
  const pending = (queued || []).map((row) => ({
    id: row.id,
    registration_id: row.registration_id,
    recipient: row.registrations?.email || "—",
    email_type: row.email_type,
    subject: row.email_type === "approved" ? "Your Reunion 2027 registration is approved" : "Your Reunion 2027 registration has been received",
    status: row.status,
    error_message: row.last_error,
    created_at: row.created_at,
    sent_at: row.sent_at,
    registrations: row.registrations,
    attempts: row.attempts,
    available_at: row.available_at,
    source: "outbox",
  }));
  const history = [...attempted, ...pending]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 150);
  return json({ logs: history }, 200, { "Cache-Control": "no-store" });
}

export async function POST(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-email-retry", 10, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return fail("Invalid email log ID.");
  try {
    if (body.source === "outbox") {
      const { data, error } = await db().from("email_outbox")
        .update({ status: "queued", available_at: new Date().toISOString(), locked_at: null, last_error: null })
        .eq("id", body.id).in("status", ["failed", "queued"]).select("id").maybeSingle();
      if (error) return dbFail("email-history:retry-queue", "Could not requeue email.", error, { admin: true });
      if (!data) return fail("Queued email was not found or is already processing.", 404);
      const baseUrl = requestOrigin(req.headers);
      after(async () => { try { await processEmailOutboxJob(data.id, { baseUrl }); } catch (e) { console.error("[email-history:retry-now]", e?.message || e); } });
      return json({ ok: true, queued: true });
    }
    const result = await retryEmailLog(body.id, { baseUrl: requestOrigin(req.headers) });
    return json({ ok: true, sent: result.sent === true });
  } catch (e) {
    return fail(String(e?.message || "Could not retry email.").slice(0, 250), 400);
  }
}
