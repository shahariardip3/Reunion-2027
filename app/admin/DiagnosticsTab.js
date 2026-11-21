"use client";
import { useCallback, useEffect, useState } from "react";
import { tr } from "../../lib/i18n";
import { hintFor } from "./api";

const LABELS = {
  env_url: ["SUPABASE_URL সেট আছে", "SUPABASE_URL is set"],
  env_key: ["Supabase সার্ভার কী (service_role / secret)", "Supabase server key (service_role / secret)"],
  env_admin: ["ADMIN_PASSWORD ও ADMIN_SECRET", "ADMIN_PASSWORD and ADMIN_SECRET"],
  env_site: ["SITE_URL (গুগল SEO-র জন্য)", "SITE_URL (for Google SEO)"],
  "table:settings": ["settings টেবিল ও কলাম", "settings table and columns"],
  "table:registrations": ["registrations টেবিল ও কলাম", "registrations table and columns"],
  "table:notices": ["notices টেবিল ও কলাম", "notices table and columns"],
  "write:settings": ["ডাটাবেসে লেখার অনুমতি", "Database write permission"],
  bucket: ["photos স্টোরেজ বাকেট (private)", "photos storage bucket (private)"],
  "rpc:rate_limit": ["নিরাপত্তা (rate-limit) ফাংশন", "Security (rate-limit) function"],
  db_client: ["Supabase সংযোগ", "Supabase connection"],
};

function advice(c, tr, lang) {
  if (c.id === "env_key" && c.status === "error")
    return tr(lang, "এটি service_role বা sb_secret_ কী নয় (anon/publishable কী ব্যবহার করবেন না)। Supabase → Project Settings → API থেকে সঠিক কী নিয়ে .env.local / Vercel-এ বসান।", "This is not a service_role / sb_secret_ key (never use the anon/publishable key). Copy the right key from Supabase → Project Settings → API into .env.local / Vercel.");
  if (c.id === "env_site") return tr(lang, "ডিপ্লয়ের পর ওয়েবসাইটের ঠিকানা SITE_URL-এ দিন, নইলে sitemap ও গুগল প্রিভিউ ঠিকমতো হবে না।", "After deploying, set SITE_URL to your website address; otherwise the sitemap and Google previews are incomplete.");
  if (c.id === "bucket" && c.status === "warn") return tr(lang, "বাকেটটি Public — Supabase → Storage → photos → Edit দিয়ে Private করুন।", "The bucket is Public — make it Private under Supabase → Storage → photos → Edit.");
  if (c.id === "bucket") return tr(lang, "photos বাকেট নেই — supabase/schema.sql অথবা schema.sql চালান।", "The photos bucket is missing — run supabase/schema.sql or schema.sql.");
  if (c.id === "rpc:rate_limit" || c.id === "write:settings" || c.id.startsWith("table:")) {
    const h = hintFor(c.code, tr, lang);
    if (h) return h;
    if (c.kind === "permission") return hintFor("42501", tr, lang);
    if (c.kind === "missing_column") return hintFor("42703", tr, lang);
    if (c.kind === "missing_table") return hintFor("42P01", tr, lang);
  }
  return "";
}

export default function DiagnosticsTab({ lang = "en" }) {
  const [checks, setChecks] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/health", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 401 ? tr(lang, "সেশন শেষ। আবার লগইন করুন।", "Session expired. Please log in again.") : tr(lang, "চেক চালানো যায়নি।", "Could not run the check."));
      setChecks(j.checks || []);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [lang]);
  useEffect(() => { run(); }, [run]);

  const problems = (checks || []).filter((c) => c.status === "error").length;
  const icon = { ok: "✅", warn: "⚠️", error: "❌" };

  return (
    <section className="card">
      <div className="scanner-title">
        <div>
          <h2>{tr(lang, "সিস্টেম চেক", "System check")}</h2>
          <p className="muted">{tr(lang, "সেভ, নোটিশ বা নিবন্ধন কাজ না করলে এখানে দেখুন কোথায় সমস্যা।", "If saving, notices or registration fail, this shows exactly what is wrong.")}</p>
        </div>
        <button type="button" className="btn ghost small" onClick={run} disabled={busy}>{busy ? "…" : tr(lang, "আবার চেক", "Re-check")}</button>
      </div>
      {error && <p className="error-panel" role="alert">{error}</p>}
      {checks && (
        <>
          <p className={problems ? "error-panel" : "success-panel"} role="status">
            {problems ? tr(lang, `${problems}টি সমস্যা পাওয়া গেছে — নিচের নির্দেশনা দেখুন।`, `${problems} problem(s) found — see the instructions below.`) : tr(lang, "সবকিছু ঠিক আছে ✓", "Everything looks good ✓")}
          </p>
          <ul className="diag-list">
            {checks.map((c) => {
              const label = LABELS[c.id] ? tr(lang, ...LABELS[c.id]) : c.id;
              const tip = c.status !== "ok" ? advice(c, tr, lang) : "";
              return (
                <li key={c.id} className={"diag-item " + c.status}>
                  <span aria-hidden="true">{icon[c.status] || "•"}</span>
                  <div>
                    <b>{label}</b>
                    {tip && <p>{tip}</p>}
                    {c.status !== "ok" && (c.code || c.detail) && c.id !== "env_site" && <code>{[c.code, c.detail].filter(Boolean).join(" — ")}</code>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
