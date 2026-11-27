import { NextResponse } from "next/server";
import { db } from "../../../../lib/supabase";
import { processEmailOutboxJob } from "../../../../lib/email";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = db();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { error: reclaimError } = await sb.from("email_outbox")
    .update({ status: "queued", locked_at: null, available_at: now })
    .eq("status", "processing").lt("locked_at", staleBefore);
  if (reclaimError) return NextResponse.json({ error: "Could not recover stale email jobs." }, { status: 503 });

  // Housekeeping: drop expired rate-limit rows so the table never grows unbounded.
  const { error: cleanupError } = await sb.rpc("cleanup_expired_rate_limits", { p_batch: 5000 });
  if (cleanupError) console.error("[cron:rate-limit-cleanup]", cleanupError.message);

  const { data: jobs, error } = await sb.from("email_outbox")
    .select("id").eq("status", "queued").lte("available_at", now)
    .order("created_at", { ascending: true }).limit(10);
  if (error) return NextResponse.json({ error: "Could not read email queue." }, { status: 503 });

  let sent = 0, failed = 0, skipped = 0;
  for (const job of jobs || []) {
    const result = await processEmailOutboxJob(job.id);
    if (result.sent) sent++;
    else if (result.skipped) skipped++;
    else failed++;
  }
  return NextResponse.json({ ok: true, checked: (jobs || []).length, sent, failed, skipped });
}
