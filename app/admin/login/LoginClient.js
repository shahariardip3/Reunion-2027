"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "../../../lib/i18n";

export default function LoginClient({ lang = "en" }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function go(e) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      if (r.ok) { router.replace("/admin"); router.refresh(); return; }
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) setErr(t(lang, "wrongPassword"));
      else if (r.status === 429) setErr(t(lang, "tooMany"));
      else if (r.status === 503) setErr(data.error || t(lang, "setupIncomplete"));
      else setErr(`${t(lang, "serverBusy")} (${r.status})`);
    } catch { setErr(t(lang, "networkError")); }
    finally { setBusy(false); }
  }
  return <>
    <h1>{t(lang, "adminLogin")}</h1>
    <form onSubmit={go} className="form-card">
      <label htmlFor="pw">{t(lang, "password")}</label>
      <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" />
      {err && <p className="error-panel" role="alert" aria-live="assertive">{err}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? t(lang, "loading") : t(lang, "login")}</button></div>
    </form>
  </>;
}
