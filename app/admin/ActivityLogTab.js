"use client";
import { useEffect, useState } from "react";
import { tr } from "../../lib/i18n";

export default function ActivityLogTab({ lang = "en" }) {
  const [logs, setLogs] = useState([]);
  const [message, setMessage] = useState("");
  async function load() {
    const r = await fetch("/api/admin/activity-log", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setLogs(j.logs || []); else setMessage(j.error || "Could not load Activity Log.");
  }
  useEffect(() => { load(); }, []);
  return <section className="card">
    <div className="row" style={{justifyContent:"space-between",alignItems:"center"}}><h2>{tr(lang,"Activity Log","Activity Log")}</h2><button className="btn ghost small" onClick={load}>{tr(lang,"রিফ্রেশ","Refresh")}</button></div>
    <p className="muted">{tr(lang,"সর্বশেষ ২৫০টি Admin কার্যক্রম। এই তালিকা Admin Panel থেকে সম্পাদনা বা মুছে ফেলা যায় না।","Latest 250 admin actions. This history cannot be edited or deleted from the Admin Panel.")}</p>
    {message && <p className="error-panel">{message}</p>}
    {logs.map(log=><article className="card item" key={log.id}>
      <div><b>{log.action.replaceAll("_"," ")}</b><div className="item-meta"><span>{log.admin_name} (@{log.admin_username})</span><span>{log.admin_role === "main" ? "Main Admin" : "Sub Admin"}</span>{log.registration_name && <span>{log.registration_name}</span>}<span>{new Date(log.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB",{timeZone:"Asia/Dhaka"})}</span></div>{Object.keys(log.details || {}).length>0 && <small className="muted">{JSON.stringify(log.details)}</small>}</div>
    </article>)}
    {!logs.length && <p>{tr(lang,"এখনো কোনো Activity Log নেই।","No activity has been logged yet.")}</p>}
  </section>;
}
