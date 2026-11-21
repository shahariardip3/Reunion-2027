"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../lib/i18n";
import { send, failText } from "./api";

const BLANK = { id: "", title_bn: "", title_en: "", body_bn: "", body_en: "", published: true, pinned: false, expires_at: "" };

export default function NoticesTab({ notices, lang = "en" }) {
  const router = useRouter();
  const [n, setN] = useState(BLANK);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const field = (k) => (e) => setN({ ...n, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await send("/api/admin/notices", n, n.id ? "PATCH" : "POST");
    setBusy(false);
    if (!res.ok) return setMsg({ type: "error", text: failText(res, tr(lang, "নোটিশ সংরক্ষণ করা যায়নি।", "Could not save the notice."), tr, lang) });
    setMsg({ type: "ok", text: tr(lang, "নোটিশ সংরক্ষণ হয়েছে।", "Notice saved.") });
    setN(BLANK); router.refresh();
  }
  async function remove(id) {
    if (!confirm(tr(lang, "নোটিশটি স্থায়ীভাবে মুছে যাবে। নিশ্চিত?", "Delete this notice permanently?"))) return;
    const res = await send("/api/admin/notices", { id }, "DELETE");
    if (res.ok) router.refresh(); else setMsg({ type: "error", text: failText(res, tr(lang, "নোটিশ মুছতে পারেনি।", "Could not delete the notice."), tr, lang) });
  }
  function edit(item) {
    setN({ ...BLANK, ...item, expires_at: item.expires_at || "" });
    setMsg(null);
    document.getElementById("notice-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <>
    <form id="notice-form" className="card" onSubmit={save}>
      <h2>{n.id ? tr(lang, "নোটিশ সম্পাদনা", "Edit notice") : tr(lang, "নতুন নোটিশ", "New notice")}</h2>
      <label>Title — বাংলা</label><input maxLength={140} required value={n.title_bn} onChange={field("title_bn")} />
      <label>Title — English</label><input maxLength={140} required value={n.title_en} onChange={field("title_en")} />
      <label>Notice — বাংলা</label><textarea rows={4} maxLength={5000} required value={n.body_bn} onChange={field("body_bn")} />
      <label>Notice — English</label><textarea rows={4} maxLength={5000} required value={n.body_en} onChange={field("body_en")} />
      <label>{tr(lang, "মেয়াদ শেষের তারিখ (ঐচ্ছিক)", "Expiry date (optional)")}</label><input type="date" value={n.expires_at || ""} onChange={field("expires_at")} />
      <label className="check"><input type="checkbox" checked={n.published} onChange={(e) => setN({ ...n, published: e.target.checked })} /> {tr(lang, "এখনই প্রকাশ করুন", "Publish now")}</label>
      <label className="check"><input type="checkbox" checked={n.pinned} onChange={(e) => setN({ ...n, pinned: e.target.checked })} /> {tr(lang, "উপরে পিন করুন", "Pin to top")}</label>
      <div className="row">
        <button className="btn" disabled={busy}>{n.id ? tr(lang, "আপডেট করুন", "Update notice") : tr(lang, "নোটিশ প্রকাশ", "Publish notice")}</button>
        <button type="button" className="btn ghost" onClick={() => { setN(BLANK); setMsg(null); }}>{tr(lang, "পরিষ্কার", "Clear")}</button>
      </div>
      {msg && <p className={msg.type === "ok" ? "success-panel" : "error-panel"} role="status">{msg.text}</p>}
    </form>

    <h2>{tr(lang, "বিদ্যমান নোটিশ", "Existing notices")}</h2>
    {notices.length === 0 && <p className="card">{tr(lang, "এখনো কোনো নোটিশ নেই।", "No notices yet.")}</p>}
    {notices.map((item) => (
      <article className="card" key={item.id}>
        <div className="item-title">
          <b>{lang === "bn" ? item.title_bn : item.title_en}</b>{" "}
          {item.pinned && <span className="badge pinned">📌</span>}{" "}
          <span className={"badge " + (item.published ? "approved" : "pending")}>{item.published ? tr(lang, "প্রকাশিত", "Published") : tr(lang, "খসড়া", "Draft")}</span>
        </div>
        <p className="muted">{lang === "bn" ? item.title_en : item.title_bn}{item.expires_at ? ` · ${tr(lang, "মেয়াদ", "Expires")}: ${item.expires_at}` : ""}</p>
        <div className="row">
          <button type="button" className="btn ghost small" onClick={() => edit(item)}>{tr(lang, "সম্পাদনা", "Edit")}</button>
          <button type="button" className="btn bad small" onClick={() => remove(item.id)}>{t(lang, "delete")}</button>
        </div>
      </article>
    ))}
  </>;
}
