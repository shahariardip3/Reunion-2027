"use client";
import { useEffect, useState } from "react";
import { tr } from "../../lib/i18n";

export default function SubAdminsTab({ lang = "en" }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: "", display_name: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const r = await fetch("/api/admin/subadmins", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setUsers(j.users || []);
    else setMessage(j.error || "Could not load accounts.");
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/admin/subadmins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMessage(j.error || "Could not create account."); return; }
      setForm({ username: "", display_name: "", password: "" });
      setMessage(tr(lang, "Sub Admin তৈরি হয়েছে।", "Sub Admin account created."));
      await load();
    } catch { setMessage("Network error."); }
    finally { setBusy(false); }
  }
  async function remove(user) {
    const password = window.prompt(tr(lang, "নিশ্চিত করতে Main Admin Password দিন:", "Enter Main Admin password to confirm:"));
    if (!password) return;
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/admin/subadmins", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, main_password: password }) });
      const j = await r.json().catch(() => ({}));
      setMessage(r.ok ? tr(lang, "Sub Admin মুছে ফেলা হয়েছে।", "Sub Admin deleted.") : (j.error || "Delete failed."));
      await load();
    } catch { setMessage("Network error."); }
    finally { setBusy(false); }
  }
  return <section className="card">
    <h2>{tr(lang, "Sub Admin ব্যবস্থাপনা", "Sub Admin Management")} ({users.length}/5)</h2>
    <form className="form-card" onSubmit={create}>
      <label>{tr(lang, "নাম", "Display name")}</label><input value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} required maxLength={80}/>
      <label>Username</label><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required minLength={3} maxLength={32}/>
      <label>{tr(lang, "পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর)", "Password (at least 10 characters)")}</label><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={10}/>
      <button className="btn" disabled={busy || users.length >= 5}>{tr(lang, "Sub Admin তৈরি করুন", "Create Sub Admin")}</button>
    </form>
    {message && <p className="success-panel" role="status">{message}</p>}
    {users.map(u=><article className="card item" key={u.id}><div><b>{u.display_name}</b><div className="item-meta"><span>@{u.username}</span><span>{u.is_active ? "Active" : "Inactive"}</span></div></div><button className="btn bad small" disabled={busy} onClick={()=>remove(u)}>{tr(lang, "মুছুন", "Delete")}</button></article>)}
  </section>;
}
