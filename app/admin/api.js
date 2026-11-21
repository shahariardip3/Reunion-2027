// Small fetch helper shared by the admin client components.
export async function send(url, body, method = "POST") {
  try {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

/** Plain-language hint for the most common Supabase error codes. */
export function hintFor(code, tr, lang) {
  switch (String(code || "")) {
    case "42501":
      return tr(lang, "ডাটাবেস টেবিলের অনুমতি নেই — Supabase SQL Editor-এ supabase/schema.sql চালান।", "Database permission denied — run supabase/schema.sql in the Supabase SQL Editor.");
    case "42P01":
    case "PGRST205":
      return tr(lang, "টেবিল পাওয়া যায়নি — supabase/schema.sql চালান।", "Table not found — run supabase/schema.sql.");
    case "42703":
    case "PGRST204":
      return tr(lang, "ডাটাবেসে নতুন কলাম নেই — supabase/schema.sql চালান।", "Database columns are missing — run supabase/schema.sql.");
    default:
      return "";
  }
}

/** Bilingual error text for a failed request, with the DB error code/hint when the server provided one. */
export function failText(res, fallback, tr, lang) {
  if (res.status === 0) return tr(lang, "নেটওয়ার্ক সমস্যা। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।", "Network error. Check your connection and try again.");
  if (res.status === 401) return tr(lang, "সেশন শেষ হয়েছে। আবার লগইন করুন।", "Your session has expired. Please log in again.");
  if (res.status === 429) return tr(lang, "অনেকবার চেষ্টা করা হয়েছে। একটু পর আবার চেষ্টা করুন।", "Too many requests. Please wait a moment.");
  const { code, detail, error } = res.data || {};
  const hint = hintFor(code, tr, lang);
  const parts = [fallback];
  if (hint) parts.push(hint);
  else if (typeof error === "string" && /Run |migration/i.test(error)) parts.push(error);
  if (code) parts.push(`[${code}${detail ? `: ${detail}` : ""}]`);
  return parts.join(" ");
}
