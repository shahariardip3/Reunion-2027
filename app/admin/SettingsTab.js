"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../lib/i18n";
import { send, failText } from "./api";

export default function SettingsTab({ settings, lang = "en" }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const val = (k) => s[k] ?? "";

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await send("/api/admin/settings", { ...s, registration_open: s.registration_open !== false });
    setBusy(false);
    if (!res.ok) return setMsg({ type: "error", text: failText(res, t(lang, "settingsNotSaved"), tr, lang) });
    setMsg({ type: "ok", text: t(lang, "settingsSaved") });
    router.refresh();
  }

  const bankFilled = !!String(s.bank_account_number || "").trim();

  return (
    <form className="card" onSubmit={save}>
      <h2>{t(lang, "settings")}</h2>

      <fieldset>
        <legend>{tr(lang, "নিবন্ধন", "Registration")}</legend>
        <label className="check"><input type="checkbox" checked={s.registration_open !== false} onChange={(e) => setS({ ...s, registration_open: e.target.checked })} /> {tr(lang, "নতুন নিবন্ধন গ্রহণ চালু রাখুন", "Accept new registrations")}</label>
        <label className="check"><input type="checkbox" checked={!!s.show_public} onChange={(e) => setS({ ...s, show_public: e.target.checked })} /> {t(lang, "publicAlumni")}</label>
      </fieldset>

      <fieldset>
        <legend>{tr(lang, "ইভেন্ট", "Event")}</legend>
        <label>{t(lang, "eventTitle")} — বাংলা</label><input value={val("event_title_bn")} onChange={set("event_title_bn")} maxLength={160} />
        <label>{t(lang, "eventTitle")} — English</label><input value={val("event_title_en")} onChange={set("event_title_en")} maxLength={160} />
        <label>{t(lang, "eventNote")} — বাংলা</label><textarea rows={3} value={val("event_note_bn")} onChange={set("event_note_bn")} maxLength={1000} />
        <label>{t(lang, "eventNote")} — English</label><textarea rows={3} value={val("event_note_en")} onChange={set("event_note_en")} maxLength={1000} />
        <label>{t(lang, "reunionDate")}</label><input type="date" value={val("reunion_date")} onChange={set("reunion_date")} />
        <label>{t(lang, "venue")} — বাংলা</label><input value={val("venue_bn")} onChange={set("venue_bn")} maxLength={160} />
        <label>{t(lang, "venue")} — English</label><input value={val("venue_en")} onChange={set("venue_en")} maxLength={160} />
      </fieldset>

      <fieldset>
        <legend>{tr(lang, "পেমেন্ট", "Payment")}</legend>
        <label>{t(lang, "amount")} (BDT)</label>
        <input type="number" min="0" step="1" inputMode="numeric" value={val("amount")} onChange={set("amount")} />
        <label>bKash {tr(lang, "নম্বর", "number")}</label>
        <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" value={val("bkash_number")} onChange={set("bkash_number")} maxLength={20} />
        <label>Nagad {tr(lang, "নম্বর", "number")}</label>
        <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX" value={val("nagad_number")} onChange={set("nagad_number")} maxLength={20} />
        <small className="hint">{tr(lang, "যে নম্বর ফাঁকা থাকবে, সেই মাধ্যম নিবন্ধন ফর্মে দেখাবে না।", "A method with an empty number is hidden from the registration form.")}</small>
        <label>{t(lang, "paymentNote")} — বাংলা</label><textarea rows={3} value={val("payment_note_bn")} onChange={set("payment_note_bn")} maxLength={1000} />
        <label>{t(lang, "paymentNote")} — English</label><textarea rows={3} value={val("payment_note_en")} onChange={set("payment_note_en")} maxLength={1000} />
      </fieldset>

      <details className="card-details" open={bankFilled}>
        <summary>🏦 {tr(lang, "ব্যাংক অ্যাকাউন্টের তথ্য (ঐচ্ছিক)", "Bank account details (optional)")}</summary>
        <p className="muted">{tr(lang, "অ্যাকাউন্ট নম্বর দিলে নিবন্ধন ফর্মে “ব্যাংক” অপশন দেখাবে। না চাইলে ফাঁকা রাখুন।", "Fill in the account number to show a “Bank” option on the registration form. Leave blank to hide it.")}</p>
        <label>{tr(lang, "ব্যাংকের নাম", "Bank name")}</label><input value={val("bank_name")} onChange={set("bank_name")} maxLength={160} />
        <label>{tr(lang, "শাখা", "Branch")}</label><input value={val("bank_branch")} onChange={set("bank_branch")} maxLength={160} />
        <label>{tr(lang, "অ্যাকাউন্টের নাম", "Account name")}</label><input value={val("bank_account_name")} onChange={set("bank_account_name")} maxLength={160} />
        <label>{tr(lang, "অ্যাকাউন্ট নম্বর", "Account number")}</label><input inputMode="numeric" value={val("bank_account_number")} onChange={set("bank_account_number")} maxLength={40} />
        <label>{tr(lang, "রাউটিং নম্বর (ঐচ্ছিক)", "Routing number (optional)")}</label><input inputMode="numeric" value={val("bank_routing")} onChange={set("bank_routing")} maxLength={160} />
        <label>{tr(lang, "ব্যাংকের অতিরিক্ত নির্দেশনা (ঐচ্ছিক)", "Extra bank instructions (optional)")}</label><textarea rows={2} value={val("bank_note")} onChange={set("bank_note")} maxLength={1000} />
      </details>

      <fieldset>
        <legend>{tr(lang, "অন্যান্য", "Other")}</legend>
        <label>Facebook Page URL ({tr(lang, "ঐচ্ছিক", "optional")})</label>
        <input type="url" inputMode="url" placeholder="https://www.facebook.com/yourpage" value={val("facebook_page_url")} onChange={set("facebook_page_url")} maxLength={300} />
        <small className="hint">{tr(lang, "ফাঁকা রাখলে লিংকটি দেখাবে না। শুধু HTTPS Facebook লিংক গ্রহণযোগ্য।", "Leave blank to hide the link. Only HTTPS Facebook links are accepted.")}</small>
      </fieldset>

      <div className="row"><button className="btn" disabled={busy}>{busy ? t(lang, "sending") : t(lang, "save")}</button></div>
      {msg && <p className={msg.type === "ok" ? "success-panel" : "error-panel"} role="status" aria-live="polite">{msg.text}</p>}
    </form>
  );
}
