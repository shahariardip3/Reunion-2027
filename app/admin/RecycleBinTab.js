"use client";
import { useEffect, useState } from "react";
import { tr } from "../../lib/i18n";

export default function RecycleBinTab({ lang = "en" }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const r = await fetch("/api/admin/recycle-bin", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setItems(j.items || []); else setMessage(j.error || "Could not load Recycle Bin.");
  }
  useEffect(() => { load(); }, []);
  async function act(item, action) {
    if (action === "permanent_delete" && !window.confirm(tr(lang, "এটি স্থায়ীভাবে মুছে যাবে।", "This will permanently delete the registration and its photo. Continue?"))) return;
    const password = window.prompt(tr(lang, "Main Admin Password দিন:", "Enter Main Admin password:"));
    if (!password) return;
    setBusy(item.id); setMessage("");
    try {
      const r = await fetch("/api/admin/recycle-bin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, action, main_password: password }) });
      const j = await r.json().catch(() => ({}));
      setMessage(r.ok ? tr(lang, "কাজ সম্পন্ন হয়েছে।", "Action completed.") : (j.error || "Action failed."));
      if (r.ok) await load();
    } catch { setMessage("Network error."); }
    finally { setBusy(""); }
  }
  return <section className="card">
    <h2>{tr(lang, "Recycle Bin", "Recycle Bin")}</h2>
    <p className="muted">{tr(lang, "মুছে ফেলা নিবন্ধন এখানে থাকবে। Restore করলে আগের তথ্য ও ছবি ফিরে আসবে।", "Deleted registrations are kept here. Restore brings back the original details and photo.")}</p>
    {message && <p className="success-panel" role="status">{message}</p>}
    {!items.length && <p>{tr(lang, "Recycle Bin খালি।", "Recycle Bin is empty.")}</p>}
    {items.map(item => {
      const r = item.registration_data || {};
      return <article className="card item" key={item.id}>
        <div><b>{r.full_name || "Unknown"}</b><div className="item-meta"><span>{r.reg_code || "No ID"}</span><span>TrxID: {r.trx_id || "—"}</span><span>{tr(lang, "মুছেছেন", "Deleted by")}: {item.deleted_by}</span><span>{new Date(item.deleted_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka" })}</span></div></div>
        <div className="row"><button className="btn small" disabled={!!busy} onClick={()=>act(item,"restore")}>{tr(lang, "Restore", "Restore")}</button><button className="btn bad small" disabled={!!busy} onClick={()=>act(item,"permanent_delete")}>{tr(lang, "স্থায়ীভাবে মুছুন", "Permanent delete")}</button></div>
      </article>;
    })}
  </section>;
}
