"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../lib/i18n";
import { send, failText } from "./api";

const BLANK = { id: "", year: "", title_bn: "", title_en: "", body_bn: "", body_en: "", sort_order: 0, published: true };

export default function HistoryTab({ events = [], lang = "en" }) {
  const router = useRouter();
  const [n, setN] = useState(BLANK);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const field = (k) => (e) => setN({ ...n, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await send("/api/admin/history", { ...n, year: Number(n.year), sort_order: Number(n.sort_order) || 0 }, n.id ? "PATCH" : "POST");
    setBusy(false);
    if (!res.ok) return setMsg({ type: "error", text: failText(res, tr(lang, "ঘটনাটি সংরক্ষণ করা যায়নি।", "Could not save the event."), tr, lang) });
    setMsg({ type: "ok", text: tr(lang, "টাইমলাইনে সংরক্ষণ হয়েছে।", "Saved to the timeline.") });
    setN(BLANK); router.refresh();
  }
  async function remove(id) {
    if (!confirm(tr(lang, "ঘটনাটি স্থায়ীভাবে মুছে যাবে। নিশ্চিত?", "Delete this event permanently?"))) return;
    const res = await send("/api/admin/history", { id }, "DELETE");
    if (res.ok) router.refresh(); else setMsg({ type: "error", text: failText(res, tr(lang, "মুছতে পারেনি।", "Could not delete."), tr, lang) });
  }
  function edit(item) {
    setN({ ...BLANK, ...item });
    setMsg(null);
    document.getElementById("history-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <>
    <p className="card muted">
      {tr(lang,
        "১৯৪০ (প্রতিষ্ঠা) ও ২০২৭ (পুনর্মিলনী) টাইমলাইনে নিজে থেকেই থাকে। এর মাঝের মাইলফলক (যেমন নতুন ভবন, স্বীকৃতি, বিশেষ অনুষ্ঠান) এখানে যোগ করুন — শুধু যাচাই করা তথ্য দিন।",
        "1940 (founding) and 2027 (reunion) are always on the timeline. Add the milestones in between here (a new building, recognition, a special event) — only verified facts, please.")}
    </p>
    <form id="history-form" className="card" onSubmit={save}>
      <h2>{n.id ? tr(lang, "ঘটনা সম্পাদনা", "Edit event") : tr(lang, "নতুন ঘটনা", "New event")}</h2>
      <label>{tr(lang, "সাল (১৯৪০–২০২৭)", "Year (1940–2027)")}</label>
      <input type="number" min={1940} max={2027} required value={n.year} onChange={field("year")} inputMode="numeric" />
      <label>Title — বাংলা</label><input maxLength={140} required value={n.title_bn} onChange={field("title_bn")} />
      <label>Title — English</label><input maxLength={140} required value={n.title_en} onChange={field("title_en")} />
      <label>{tr(lang, "বিবরণ — বাংলা (ঐচ্ছিক)", "Details — বাংলা (optional)")}</label><textarea rows={3} maxLength={1000} value={n.body_bn} onChange={field("body_bn")} />
      <label>{tr(lang, "বিবরণ — English (ঐচ্ছিক)", "Details — English (optional)")}</label><textarea rows={3} maxLength={1000} value={n.body_en} onChange={field("body_en")} />
      <label>{tr(lang, "একই সালে ক্রম (ছোট সংখ্যা আগে)", "Order within the same year (lower first)")}</label>
      <input type="number" min={-1000} max={1000} value={n.sort_order} onChange={field("sort_order")} />
      <label className="check"><input type="checkbox" checked={n.published} onChange={(e) => setN({ ...n, published: e.target.checked })} /> {tr(lang, "সাইটে দেখান", "Show on the site")}</label>
      <div className="row">
        <button className="btn" disabled={busy}>{n.id ? tr(lang, "আপডেট করুন", "Update event") : tr(lang, "টাইমলাইনে যোগ করুন", "Add to timeline")}</button>
        <button type="button" className="btn ghost" onClick={() => { setN(BLANK); setMsg(null); }}>{tr(lang, "পরিষ্কার", "Clear")}</button>
      </div>
      {msg && <p className={msg.type === "ok" ? "success-panel" : "error-panel"} role="status">{msg.text}</p>}
    </form>

    <h2>{tr(lang, "টাইমলাইনের ঘটনাসমূহ", "Timeline events")}</h2>
    {events.length === 0 && <p className="card">{tr(lang, "এখনো কোনো ঘটনা যোগ করা হয়নি।", "No events added yet.")}</p>}
    {events.map((item) => (
      <article className="card" key={item.id}>
        <div className="item-title">
          <b>{item.year} — {lang === "bn" ? item.title_bn : item.title_en}</b>{" "}
          <span className={"badge " + (item.published ? "approved" : "pending")}>{item.published ? tr(lang, "প্রকাশিত", "Published") : tr(lang, "লুকানো", "Hidden")}</span>
        </div>
        <p className="muted">{lang === "bn" ? item.title_en : item.title_bn}</p>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={() => edit(item)}>{tr(lang, "সম্পাদনা", "Edit")}</button>
          <button type="button" className="btn bad small" onClick={() => remove(item.id)}>{t(lang, "delete")}</button>
        </div>
      </article>
    ))}
  </>;
}
