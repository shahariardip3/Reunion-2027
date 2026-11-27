import { getAdminSession } from "../../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../../lib/security";
import { db } from "../../../../../lib/supabase";
import { fail, json } from "../../../../../lib/http";
import { writeAudit } from "../../../../../lib/audit-log";
import { after } from "next/server";
import { processEmailOutboxJob } from "../../../../../lib/email";
import { requestOrigin } from "../../../../../lib/site";
export async function POST(req) {
  const session = await getAdminSession();
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "main") return fail("Only Main Admin can run bulk actions.", 403);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-bulk", 10, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids)] : [];
  const action = body.action;
  if (!ids.length || ids.length > 50 || ids.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) return fail("Select between 1 and 50 valid registrations.");
  if (!['approve','reject'].includes(action)) return fail("Unsupported bulk action.");
  const sb = db(); let succeeded = 0; const errors = [];
  for (const id of ids) {
    if (action === 'approve') {
      const { data: code, error } = await sb.rpc('approve_registration', { p_id: id });
      if (error || !code) errors.push(id); else {
        succeeded++;
        const { data: reg } = await sb.from('registrations').select('email').eq('id', id).maybeSingle();
        if (reg?.email) {
          const { data: job } = await sb.from('email_outbox').upsert({ registration_id: id, email_type: 'approved', status: 'queued', available_at: new Date().toISOString() }, { onConflict: 'registration_id,email_type', ignoreDuplicates: true }).select('id').maybeSingle();
          // Send now (with the live site address in the card link) instead of waiting for the once-a-day cron.
          if (job?.id) { const baseUrl = requestOrigin(req.headers); after(async () => { try { await processEmailOutboxJob(job.id, { baseUrl }); } catch (e) { console.error('[bulk-approve:email]', e?.message || e); } }); }
        }
        await writeAudit('bulk_registration_approved', null, { registration_id: id, reg_code: code });
      }
    } else {
      const { data: changed, error } = await sb.from('registrations').update({ status: 'rejected' }).eq('id', id).select('id').maybeSingle();
      if (error || !changed) errors.push(id); else { succeeded++; await writeAudit('bulk_registration_rejected', null, { registration_id: id }); }
    }
  }
  return json({ ok: errors.length === 0, requested: ids.length, succeeded, failed: errors.length, failed_ids: errors });
}
