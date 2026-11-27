"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { t, tr } from "../../lib/i18n";
import { normalizeDigits, normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../../lib/format";

const SERVER_ERRORS = {
  "Transaction ID and registered phone number are required.": "statusMissing",
  "Transaction ID and registration number (or registered phone number) are required.": "statusMissing",
  "No registration found with those details.": "statusNoMatch",
  "Could not check status. Try again.": "statusFail",
};


function LampReveal({ children, lang }) {
  const [on, setOn] = useState(false);
  const [pull, setPull] = useState(0);
  const drag = useRef(null);
  const frame = useRef(0);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
    return () => cancelAnimationFrame(frame.current);
  }, []);
  const springBack = () => {
    cancelAnimationFrame(frame.current);
    if (reduced.current) { setPull(0); return; }
    let y = pull, velocity = -1.8;
    const tick = () => {
      velocity += -y * 0.19;
      velocity *= 0.78;
      y += velocity;
      if (Math.abs(y) < 0.35 && Math.abs(velocity) < 0.35) { setPull(0); return; }
      setPull(y);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const startPull = (e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { y: e.clientY, moved: false };
  };
  const movePull = (e) => {
    if (!drag.current) return;
    const delta = Math.max(0, Math.min(62, e.clientY - drag.current.y));
    if (delta > 5) drag.current.moved = true;
    setPull(delta);
  };
  const endPull = () => {
    if (!drag.current) return;
    const amount = pull;
    drag.current = null;
    springBack();
    if (amount > 13 || !amount) setOn(v => !v);
  };
  const toggle = () => setOn(v => !v);
  return (
    <section className={`lamp-registration ${on ? "lamp-is-on" : "lamp-is-off"}`}>
      <div className="lamp-scene" aria-label={tr(lang, "স্ট্যাটাস দেখতে ল্যাম্পের দড়ি টানুন", "Pull the lamp cord to turn on the status check")}>
        <div className="lamp-scene-stars" aria-hidden="true" />
        <div className="lamp-beam" aria-hidden="true" />
        <div className="lamp-art" aria-hidden="true">
          <svg viewBox="0 0 260 290" role="presentation">
            <defs><linearGradient id="lampShade" x1="0" x2="1"><stop stopColor="#8b672b"/><stop offset=".5" stopColor="#f4c75d"/><stop offset="1" stopColor="#7b5723"/></linearGradient><linearGradient id="lampStem" x1="0" x2="1"><stop stopColor="#51412b"/><stop offset=".5" stopColor="#d1aa5e"/><stop offset="1" stopColor="#44351f"/></linearGradient></defs>
            <ellipse cx="128" cy="276" rx="76" ry="8" fill="#07090c" opacity=".75"/>
            <path d="M128 175 L128 268" stroke="url(#lampStem)" strokeWidth="9" strokeLinecap="round"/><path d="M83 273 Q128 258 173 273 L183 280 Q128 292 73 280Z" fill="url(#lampStem)" stroke="#e0b65e" strokeOpacity=".45"/>
            <path d="M85 80 Q128 60 171 80 L155 128 Q128 139 101 128Z" fill="url(#lampShade)" stroke="#f5d27a" strokeWidth="2"/><ellipse cx="128" cy="81" rx="43" ry="10" fill="#f4d17a"/><path d="M107 127 Q128 141 149 127" fill="none" stroke="#e7bd62" strokeWidth="4"/><path d="M128 74 V60" stroke="#d8b46a" strokeWidth="7" strokeLinecap="round"/><path d="M128 58 V44" stroke="#b9914b" strokeWidth="4"/>
            <path d="M162 117 Q177 131 177 153" fill="none" stroke="#c9a45f" strokeWidth="2.2"/><path d="M177 153 V176" stroke="#d7b66d" strokeWidth="2.2"/><circle cx="177" cy="183" r="6" fill="#d4aa55" stroke="#fff0bb" strokeWidth="1.5"/>
          </svg>
          <svg className="lamp-cord" viewBox="0 0 50 120" aria-label={tr(lang, "ল্যাম্পের টানার দড়ি", "Lamp pull cord")}>
            <path d={`M25 0 Q${25 + pull * .16} ${28 + pull * .35} 25 ${55 + pull}`} fill="none" stroke="#e5c477" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="25" cy={61 + pull} r="8" fill="#f4cf73" stroke="#fff0bd" strokeWidth="2" style={{filter:"drop-shadow(0 0 7px rgba(255,207,105,.8))"}} onPointerDown={startPull} onPointerMove={movePull} onPointerUp={endPull} onPointerCancel={endPull} />
            <circle cx="25" cy={61 + pull} r="17" fill="transparent" style={{cursor:"grab",touchAction:"none"}} onPointerDown={startPull} onPointerMove={movePull} onPointerUp={endPull} onPointerCancel={endPull}/>
          </svg>
        </div>
        <div className="lamp-desk" aria-hidden="true"><span/><span/><span/></div>
        <div className="lamp-scene-copy"><span className="lamp-eyebrow">REUNION 2027 · STATUS CHECK</span><strong>{on ? tr(lang, "স্ট্যাটাস দেখার আলো জ্বলে উঠেছে!", "Your status check is ready!") : tr(lang, "একটু আলো জ্বালান", "Let’s light up your memories")}</strong><small>{on ? tr(lang, "এখন আপনার নিবন্ধনের তথ্য দিন", "Enter your registration details beside the lamp") : tr(lang, "ল্যাম্পের দড়ি টেনে স্ট্যাটাস ফর্ম খুলুন", "Pull down the cord to reveal the status form")}</small></div>
        <button type="button" className="lamp-accessible-toggle" onClick={toggle} aria-pressed={on}>{on ? tr(lang, "আলো বন্ধ করুন", "Turn light off") : tr(lang, "লাইট অন করুন", "Turn light on")}</button>
      </div>
      <div className="lamp-form-reveal" aria-hidden={!on} inert={!on}>
        {children}
      </div>
    </section>
  );
}


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
  return <LampReveal lang={lang}>
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
  </LampReveal>;
}
