"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../../lib/i18n";

export default function LoginClient({ lang = "en" }) {
  const [mode, setMode] = useState("main");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function go(e) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, username, password: pw }) });
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
    <div className="tabs" role="group" aria-label="Login type">
      <button type="button" className={"btn chip " + (mode === "main" ? "" : "ghost")} onClick={() => { setMode("main"); setErr(""); }}>{tr(lang, "Main Admin", "Main Admin")}</button>
      <button type="button" className={"btn chip " + (mode === "sub" ? "" : "ghost")} onClick={() => { setMode("sub"); setErr(""); }}>{tr(lang, "Sub Admin", "Sub Admin")}</button>
    </div>
    <form onSubmit={go} className="form-card">
      {mode === "sub" && <><label htmlFor="username">Username</label><input id="username" value={username} onChange={e=>setUsername(e.target.value)} required autoComplete="username" /></>}
      <label htmlFor="pw">{t(lang, "password")}</label>
      <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required autoComplete="current-password" />
      {err && <p className="error-panel" role="alert" aria-live="assertive">{err}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? t(lang, "loading") : t(lang, "login")}</button></div>
    </form>
  </>;
}
