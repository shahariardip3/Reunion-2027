import { db, describeKey } from "../../../../lib/supabase";
import { isMainAdmin, isAdminAuthConfigured } from "../../../../lib/auth";
import { siteUrl, requestOrigin } from "../../../../lib/site";
import { fail, json } from "../../../../lib/http";

// Columns the current version of the site needs, per table.
const PROBES = {
  settings: "id,registration_open,reunion_date,venue_bn,event_title_bn,payment_note_bn,bkash_number,nagad_number,bank_name,bank_branch,bank_account_name,bank_account_number,bank_routing,bank_note,facebook_page_url,show_public,amount,email_field_enabled,email_field_required,tshirt_field_enabled,tshirt_field_required,tshirt_sizes",
  registrations: "id,full_name,ssc_batch,profession,phone,email,tshirt_size,phone_public,photo_path,trx_id,pay_method,status,reg_code,checkin_token,card_token,attended_at,attended_by",
  notices: "id,title_bn,title_en,body_bn,body_en,published,pinned,expires_at,updated_at",
  email_logs: "id,recipient,email_type,status,created_at",
  admin_users: "id,username,display_name,is_active,created_at",
  activity_logs: "id,admin_username,admin_role,action,created_at",
  registration_trash: "id,original_id,deleted_by,deleted_at",
  admin_sessions: "session_id,username,role,expires_at,revoked_at",
  email_outbox: "id,registration_id,email_type,status,attempts,available_at",
};

function classify(error) {
  const c = error?.code;
  if (c === "42501") return "permission";
  if (c === "42P01" || c === "PGRST205") return "missing_table";
  if (c === "42703" || c === "PGRST204") return "missing_column";
  return "other";
}

/** Admin-only diagnostics: tells the admin exactly what is wrong with the Supabase setup. */
export async function GET(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const checks = [];
  const add = (id, status, extra = {}) => checks.push({ id, status, ...extra });

  const key = describeKey();
  add("env_url", process.env.SUPABASE_URL ? "ok" : "error");
  add("env_key", key.ok ? "ok" : "error", { detail: key.type });
  add("env_admin", isAdminAuthConfigured() ? "ok" : "error");
  const nowHost = requestOrigin(req.headers);
  const configured = siteUrl();
  let siteStatus = configured ? "ok" : "warn", siteDetail = configured;
  try { if (configured && nowHost && new URL(configured).host !== new URL(nowHost).host) { siteStatus = "warn"; siteDetail = `SITE_URL = ${configured}, but you are using ${nowHost}. Update SITE_URL in Vercel (e-mail links use the address you approve from).`; } } catch {}
  add("env_site", siteStatus, { detail: siteDetail });
  add("env_email", process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD ? "ok" : "warn", { detail: process.env.GMAIL_USER ? "Gmail address set" : "Gmail SMTP not configured" });

  let sb;
  try { sb = db(); } catch (e) { add("db_client", "error", { detail: e.message }); return json({ checks }, 200, { "Cache-Control": "no-store" }); }

  for (const [table, cols] of Object.entries(PROBES)) {
    const { error } = await sb.from(table).select(cols).limit(1);
    add(`table:${table}`, error ? "error" : "ok", error ? { kind: classify(error), code: error.code, detail: error.message?.slice(0, 200) } : {});
  }

  const write = await sb.from("settings").update({ id: 1 }).eq("id", 1);
  add("write:settings", write.error ? "error" : "ok", write.error ? { kind: classify(write.error), code: write.error.code, detail: write.error.message?.slice(0, 200) } : {});

  const bucket = await sb.storage.getBucket("photos");
  if (bucket.error || !bucket.data) add("bucket", "error", { detail: bucket.error?.message });
  else add("bucket", bucket.data.public ? "warn" : "ok", { detail: bucket.data.public ? "public" : "private" });

  const rl = await sb.rpc("consume_rate_limit", { p_key_hash: "health-check", p_limit: 1000, p_window_seconds: 60 });
  add("rpc:rate_limit", rl.error ? "error" : "ok", rl.error ? { code: rl.error.code, detail: rl.error.message?.slice(0, 200) } : {});
  const cleanup = await sb.rpc("cleanup_expired_rate_limits", { p_batch: 1 });
  add("rpc:rate_limit_cleanup", cleanup.error ? "error" : "ok", cleanup.error ? { code: cleanup.error.code, detail: cleanup.error.message?.slice(0, 200) } : {});
  add("env_cron", process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 32 ? "ok" : "warn", { detail: process.env.CRON_SECRET ? "Cron secret configured" : "Email outbox worker is disabled" });

  return json({ checks }, 200, { "Cache-Control": "no-store" });
}
