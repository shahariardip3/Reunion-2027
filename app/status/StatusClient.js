"use client";
import { useState } from "react";
import Link from "next/link";
import { t, tr } from "../../lib/i18n";
import { normalizeDigits, normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../../lib/format";

const SERVER_ERRORS = {
  "Transaction ID and registered phone number are required.": "statusMissing",
  "No registration found with those details.": "statusNoMatch",
  "Could not check status. Try again.": "statusFail",
};

export default function StatusClient({ lang = "en" }) {
  const [trx, setTrx] = useState("");
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function check(e) {
    e.preventDefault();
    setErr(""); setRes(null);
    const cleanTrx = normalizeTrx(trx), cleanPhone = normalizePhone(phone);
    if (!TRX_RE.test(cleanTrx) || !PHONE_RE.test(cleanPhone)) return setErr(t(lang, "statusMissing"));
    setBusy(true);
    try {
      const r = await fetch("/api/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trx: cleanTrx, phone: cleanPhone, lang }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 429) setErr(t(lang, "tooMany"));
        else if (r.status === 503) setErr(t(lang, "serverBusy"));
        else setErr(SERVER_ERRORS[j.error] ? t(lang, SERVER_ERRORS[j.error]) : t(lang, "statusFail"));
      } else setRes({ ...j, trx: cleanTrx, phone: cleanPhone });
    } catch { setErr(t(lang, "networkError")); }
    finally { setBusy(false); }
  }

  const stepClass2 = res?.status === "pending" ? "is-current" : res?.status === "approved" ? "is-done" : "is-failed";
  return <>
    <h1>{t(lang, "statusTitle")}</h1>
    <form onSubmit={check} className="form-card" noValidate>
      <label htmlFor="trx">{t(lang, "trx")}</label>
      <input id="trx" value={trx} onChange={(e) => setTrx(normalizeTrx(e.target.value))} required maxLength={30} autoComplete="off" autoCapitalize="characters" />
      <label htmlFor="phone">{t(lang, "registeredPhone")}</label>
      <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(normalizeDigits(e.target.value))} required inputMode="numeric" maxLength={16} autoComplete="tel" placeholder="017XXXXXXXX" />
      {err && <p className="error-panel" role="alert">{err}</p>}
      <div className="row"><button className="btn" disabled={busy}>{busy ? t(lang, "loading") : t(lang, "check")}</button></div>
    </form>

    {res && <section className="card result-card status-result" aria-live="polite">
      <div className="status-result-head">
        <div><span className="status-kicker">{tr(lang, "নিবন্ধনের তথ্য", "REGISTRATION DETAILS")}</span><h2>{res.full_name}</h2></div>
        <span className={"badge " + res.status}>{t(lang, res.status)}</span>
      </div>
      <div className="status-reference"><span>{tr(lang, "ট্রানজ্যাকশন আইডি", "TRANSACTION ID")}</span><b>{res.trx}</b></div>
      <div className={"status-track status-" + res.status}>
        <div className="status-track-line"><span /></div>
        <div className="status-step is-done"><i>✓</i><div><b>{tr(lang, "নিবন্ধন জমা", "Registration received")}</b><small>{tr(lang, "আপনার তথ্য পাওয়া গেছে", "Your details are received")}</small></div></div>
        <div className={"status-step " + stepClass2}><i>{res.status === "approved" ? "✓" : res.status === "rejected" ? "!" : "2"}</i><div><b>{tr(lang, "পেমেন্ট যাচাই", "Payment verification")}</b><small>{res.status === "pending" ? tr(lang, "অ্যাডমিন যাচাই করছেন", "Waiting for admin review") : res.status === "approved" ? tr(lang, "পেমেন্ট যাচাই সম্পন্ন", "Payment verified") : tr(lang, "যাচাই সম্পন্ন হয়নি", "Could not be verified")}</small></div></div>
        <div className={"status-step " + (res.status === "approved" ? "is-done" : "is-upcoming")}><i>{res.status === "approved" ? "✓" : "3"}</i><div><b>{tr(lang, "নিবন্ধন অনুমোদন", "Registration approval")}</b><small>{res.status === "approved" ? tr(lang, "আপনি ইভেন্টে অংশ নিতে পারবেন", "You are confirmed for the event") : tr(lang, "যাচাইয়ের পর সম্পন্ন হবে", "Completed after verification")}</small></div></div>
      </div>
      {res.status === "approved" && <div className="status-approved-panel">
        <p>{tr(lang, "আপনার রেজিস্ট্রেশন আইডি", "Your registration ID")}: <b className="idcode">{res.reg_code}</b></p>
        <Link className="btn" href="/card" onClick={() => { try { sessionStorage.setItem("reunion_card_lookup", JSON.stringify({ trx: res.trx, phone: res.phone, lang })); } catch {} }}>{t(lang, "idCard")}</Link>
      </div>}
      {res.status === "pending" && <p className="status-note">{t(lang, "pendingNote")}</p>}
      {res.status === "rejected" && <p className="status-note status-note-error">{t(lang, "rejectedNote")}</p>}
    </section>}
  </>;
}
