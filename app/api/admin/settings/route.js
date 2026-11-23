import { db } from "../../../../lib/supabase";
import { isMainAdmin } from "../../../../lib/auth";
import { writeAudit } from "../../../../lib/audit-log";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, isMissingColumn } from "../../../../lib/http";

const SHORT = ["event_title_bn", "event_title_en", "venue_bn", "venue_en", "bank_name", "bank_branch", "bank_account_name", "bank_routing"];
const LONG = ["event_note_bn", "event_note_en", "payment_note_bn", "payment_note_en", "bank_note"];
const NUMBERS = { bkash_number: /^[0-9+\-\s]{6,20}$/, nagad_number: /^[0-9+\-\s]{6,20}$/, bank_account_number: /^[0-9A-Za-z\-\s]{4,40}$/ };

function isFacebook(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "facebook.com" || u.hostname.endsWith(".facebook.com") || u.hostname === "fb.me");
  } catch { return false; }
}

export async function POST(req) {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-write", 60, 60); if (limited) return limited;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return fail("Invalid settings.");

  const amount = Number(b.amount === "" || b.amount == null ? 0 : b.amount);
  if (!Number.isInteger(amount) || amount < 0 || amount > 1_000_000) return fail("Invalid amount.");

  const sizes = Array.isArray(b.tshirt_sizes) ? b.tshirt_sizes.map((v) => String(v).trim().toUpperCase()).filter(Boolean) : [];
  if (sizes.length > 20 || sizes.some((v) => !/^[A-Z0-9-]{1,12}$/.test(v)) || new Set(sizes).size !== sizes.length) return fail("Invalid T-shirt size options.");
  const row = {
    id: 1, amount, show_public: b.show_public === true, registration_open: b.registration_open !== false,
    email_field_enabled: b.email_field_enabled !== false, email_field_required: b.email_field_enabled !== false && b.email_field_required !== false,
    tshirt_field_enabled: b.tshirt_field_enabled === true, tshirt_field_required: b.tshirt_field_enabled === true && b.tshirt_field_required === true,
    tshirt_sizes: sizes.length ? sizes : ["S","M","L","XL","XXL","XXXL"],
  };
  for (const key of [...SHORT, ...LONG]) {
    const value = typeof b[key] === "string" ? b[key].trim() : "";
    if (value.length > (LONG.includes(key) ? 1000 : 160)) return fail(`Field "${key}" is too long.`);
    row[key] = value;
  }
  for (const [key, re] of Object.entries(NUMBERS)) {
    const value = typeof b[key] === "string" ? b[key].trim() : "";
    if (value && !re.test(value)) return fail(`Invalid value in "${key}".`);
    row[key] = value;
  }
  const facebook = typeof b.facebook_page_url === "string" ? b.facebook_page_url.trim() : "";
  if (facebook && (facebook.length > 300 || !isFacebook(facebook))) return fail("Use a valid HTTPS Facebook page URL.");
  row.facebook_page_url = facebook;
  if (b.reunion_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.reunion_date)) return fail("Invalid event date.");
  row.reunion_date = b.reunion_date || null;

  const { error } = await db().from("settings").upsert(row);
  if (error) {
    const msg = isMissingColumn(error)
      ? "Database columns are missing. Run supabase/schema.sql in the Supabase SQL Editor."
      : "Could not save settings.";
    return dbFail("settings", msg, error, { admin: true });
  }
  await writeAudit("settings_updated", null, { email_field_enabled: row.email_field_enabled, tshirt_field_enabled: row.tshirt_field_enabled });
  return json({ ok: true });
}
