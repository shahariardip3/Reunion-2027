 "use client";
import { useEffect, useState } from "react";
import { tr } from "../../lib/i18n";

export default function EmailHistoryTab({ lang = "en" }) {
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const r = await fetch("/api/admin/email-history", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setLogs(j.logs || []);
    else setMessage(j.error || "Could not load email history.");
  }
  useEffect(() => { load(); }, []);

  async function retry(id) {
    setBusy(id); setMessage("");
    try {
      const r = await fetch("/api/admin/email-history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, source: logs.find((item) => item.id === id)?.source }) });
      const j = await r.json().catch(() => ({}));
      setMessage(r.ok && (j.sent || j.queued) ? (j.queued ? tr(lang, "ইমেইল কিউতে যোগ করা হয়েছে।", "Email added back to the sending queue.") : tr(lang, "ইমেইল পুনরায় পাঠানো হয়েছে।", "Email sent again.")) : (j.error || tr(lang, "ইমেইল পাঠানো যায়নি।", "Email could not be sent.")));
      await load();
    } catch { setMessage(tr(lang, "নেটওয়ার্ক সমস্যা।", "Network error.")); }
    finally { setBusy(""); }
  }

  return <section className="card">
    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
      <h2>{tr(lang, "ইমেইল ইতিহাস", "Email History")}</h2>
      <button className="btn ghost small" type="button" onClick={load}>{tr(lang, "রিফ্রেশ", "Refresh")}</button>
    </div>
    <p className="muted">{tr(lang, "সর্বশেষ ১০০টি ইমেইলের অবস্থা। ব্যর্থ ইমেইল আবার পাঠাতে পারবেন।", "Latest 100 email attempts. Failed emails can be retried.")}</p>
    {message && <p className="success-panel" role="status">{message}</p>}
    {!logs.length && <p>{tr(lang, "এখনো কোনো ইমেইল রেকর্ড নেই।", "No email records yet.")}</p>}
    {logs.map((log) => <article className="card item" key={log.id}>
      <div>
        <b>{log.registrations?.full_name || "Registration"}</b>
        <div className="item-meta">
          <span>{log.recipient}</span>
          <span>{log.email_type === "approved" ? "Approval email" : "Registration received email"}</span>
          <span className={"badge " + log.status}>{log.status}</span>
          {log.source === "outbox" && <span>{tr(lang, `চেষ্টা: ${log.attempts || 0}`, `Attempts: ${log.attempts || 0}`)}</span>}
          <span>{new Date(log.created_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka" })}</span>
          {log.source === "outbox" && log.status === "queued" && log.available_at && <span>{tr(lang, "পরবর্তী চেষ্টা: ", "Next attempt: ")}{new Date(log.available_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka" })}</span>}
        </div>
        {log.error_message && <p className="error-panel compact">{log.error_message}</p>}
      </div>
      {(log.status === "failed" || (log.source === "outbox" && log.status === "queued")) && <button type="button" className="btn small" disabled={!!busy} onClick={() => retry(log.id)}>{busy === log.id ? tr(lang, "পাঠানো হচ্ছে…", "Sending…") : tr(lang, "আবার কিউতে দিন", "Retry / Queue")}</button>}
    </article>)}
  </section>;
}
