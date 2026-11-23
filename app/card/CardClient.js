"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { t, tr } from "../../lib/i18n";

export default function CardClient({ lang = "en" }) {
  const [d, setD] = useState(null);
  const [qr, setQr] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    let lookup = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const reg = params.get("reg");
      const trx = params.get("trx");
      if (reg && trx) lookup = { reg_code: reg, trx };
      if (!lookup) lookup = JSON.parse(sessionStorage.getItem("reunion_card_lookup") || "null");
    } catch {}
    if (!lookup?.trx || (!lookup?.phone && !lookup?.reg_code)) { setErr(t(lang, "statusFirst")); return; }
    (async () => {
      try {
        const r = await fetch("/api/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trx: lookup.trx, phone: lookup.phone, reg_code: lookup.reg_code, lang }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(r.status === 429 ? t(lang, "tooMany") : t(lang, "statusFail"));
        if (j.status !== "approved") throw new Error(t(lang, "pendingNote"));
        const image = await QRCode.toDataURL(j.checkin_token, { width: 320, margin: 2, errorCorrectionLevel: "M" });
        if (!cancelled) { setD(j); setQr(image); }
      } catch (e) { if (!cancelled) setErr(e.message || t(lang, "statusFail")); }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  if (err) return (
    <section className="card state-card">
      <p className="error-panel" role="alert">{err}</p>
      <div className="row" style={{ justifyContent: "center" }}><Link className="btn" href="/status">{t(lang, "checkStatus")}</Link></div>
    </section>
  );
  if (!d) return <div className="loading" role="status"><span className="spinner" aria-hidden="true" /><span className="sr-only">{t(lang, "loading")}</span></div>;

  return <>
    <div className="confirmation-card" id="confirmation-pdf">
      <div className="confirmation-head">
        <img src="/logo-128.png" alt="" width="68" height="68" />
        <div>
          <span>{tr(lang, "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়", "GANGANANDAPUR SECONDARY SCHOOL")}</span>
          <h1>{tr(lang, "পুনর্মিলনী ২০২৭", "REUNION 2027")}</h1>
          <small>{tr(lang, "অফিসিয়াল নিবন্ধন নিশ্চিতকরণ", "OFFICIAL REGISTRATION CONFIRMATION")}</small>
        </div>
      </div>
      <div className="confirmation-body">
        <div className="confirmation-person">
          {d.photo_url && <img className="confirmation-photo" src={d.photo_url} alt={d.full_name} />}
          <div>
            <h2>{d.full_name}</h2>
            <p>{t(lang, "ssc")}: <b>{d.ssc_batch}</b></p>
            <p>{t(lang, "profession")}: <b>{d.profession || "—"}</b></p>
            <div className="idcode">{d.reg_code}</div>
          </div>
        </div>
        <div className="confirmation-qr">
          {qr && <img src={qr} alt={tr(lang, "প্রবেশের QR কোড", "Entry QR code")} width="154" height="154" />}
          <b>{tr(lang, "প্রবেশ যাচাইয়ের QR", "ENTRY VERIFICATION QR")}</b>
          <small>{tr(lang, "প্রবেশের সময় এই QR অ্যাডমিনকে দেখান।", "Show this QR to the reunion admin at check-in.")}</small>
        </div>
      </div>
      <div className="confirmation-foot">{tr(lang, "অনুমোদিত নিবন্ধন · অনুষ্ঠানে প্রবেশের জন্য এই কার্ড সংরক্ষণ করুন", "Approved registration · Keep this confirmation for event entry")}</div>
    </div>
    {d.attended_at && <p className="success-panel noprint">{tr(lang, "উপস্থিতি নিশ্চিত হয়েছে:", "Attendance marked:")} {new Date(d.attended_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka" })}</p>}
    <div className="row noprint" style={{ justifyContent: "center" }}>
      <button type="button" className="btn" onClick={() => window.print()}>{tr(lang, "PDF সংরক্ষণ / প্রিন্ট", "Download PDF / Print")}</button>
      {qr && <a className="btn ghost" href={qr} download={`reunion-qr-${d.reg_code}.png`}>{tr(lang, "QR ছবি সংরক্ষণ", "Save QR image")}</a>}
    </div>
  </>;
}
