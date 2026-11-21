import { db } from "./supabase";

export async function getSettings() {
  const { data, error } = await db().from("settings").select("*").eq("id", 1).maybeSingle();
  if (error) console.error("[settings]", error.code || "", error.message);
  return data || {};
}

/** Registration is open unless the admin explicitly closed it. */
export const isRegistrationOpen = (s) => s?.registration_open !== false;

/** Text for the active language, falling back to the legacy single-language column. */
export function localized(s, base, lang) {
  if (!s) return "";
  return (lang === "bn" ? s[`${base}_bn`] : s[`${base}_en`]) || s[base] || "";
}

/** Today's date (YYYY-MM-DD) in Bangladesh time. */
export function todayInDhaka() {
  return new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);
}

const clean = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Builds the list of payment channels the admin has configured.
 * bKash / Nagad need a number; a bank channel appears only when an account number is filled in.
 * Only fields that are safe to show publicly are returned.
 */
export function paymentMethods(s) {
  const out = [];
  // Older databases stored a single number + method name; use it as a fallback.
  const legacy = clean(s.payment_number), legacyName = clean(s.payment_method).toLowerCase();
  const bkash = clean(s.bkash_number) || (legacy && legacyName.includes("bkash") ? legacy : "");
  const nagad = clean(s.nagad_number) || (legacy && legacyName.includes("nagad") ? legacy : "");
  if (bkash) out.push({ id: "bkash", number: bkash });
  if (nagad) out.push({ id: "nagad", number: nagad });
  if (clean(s.bank_account_number)) {
    out.push({
      id: "bank", bankName: clean(s.bank_name), branch: clean(s.bank_branch), accountName: clean(s.bank_account_name),
      accountNumber: clean(s.bank_account_number), routing: clean(s.bank_routing), note: clean(s.bank_note),
    });
  }
  return out;
}
