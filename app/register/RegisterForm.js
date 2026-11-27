"use client";
import { useEffect, useRef, useState } from "react";
import Confetti from "./Confetti";
import Link from "next/link";
import { t, tr } from "../../lib/i18n";
import { copyText } from "../../lib/clipboard";
import { normalizeDigits, normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../../lib/format";

const MAX = 220 * 1024;
const DRAFT_KEY = "reunion_reg_draft";
const EMPTY = { full_name: "", ssc_batch: "", profession: "", phone: "", email: "", tshirt_size: "", trx_id: "" };

/* ---------- photo helpers ---------- */
async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    for (const opts of [{ imageOrientation: "from-image" }, undefined]) {
      try {
        const bmp = await (opts ? createImageBitmap(file, opts) : createImageBitmap(file));
        return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close?.() };
      } catch {}
    }
  }
  const url = URL.createObjectURL(file);       // fallback for browsers without createImageBitmap
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
}

async function compress(file) {
  const image = await decodeImage(file);
  try {
    let side = 700;
    for (let i = 0; i < 6; i++) {
      const k = Math.min(1, side / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * k));
      canvas.height = Math.max(1, Math.round(image.height * k));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";                  // transparent PNGs would turn black as JPEG
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);
      for (let q = 0.85; q >= 0.4; q -= 0.1) {
        const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", q));
        if (blob && blob.size <= MAX) return blob;
      }
      side = Math.round(side * 0.8);
    }
  } finally { image.release(); }
  throw new Error("too big");
}

/* ---------- server error → friendly message ---------- */
const SERVER_ERRORS = {
  "Name must be 3–80 valid characters.": "invalidName",
  "SSC batch must be a 4-digit year.": "invalidBatch",
  "Enter a valid Bangladesh mobile number.": "invalidPhone",
  "Enter a valid present profession.": "invalidProfession",
  "Enter a valid transaction ID.": "invalidTrx",
  "Photo is required.": "choosePhoto",
  "Photo must be under 220 KB.": "largePhoto",
  "Only JPG, PNG or WebP photos are allowed.": "invalidImage",
  "The uploaded file is not a valid image.": "invalidImage",
  "This transaction ID has already been used.": "duplicateTrx",
  "Registration is closed.": "registrationClosed",
  "Email address is required.": "requiredEmail",
  "Enter a valid email address.": "invalidEmail",
  "T-shirt size is required.": "requiredTshirt",
  "Invalid T-shirt size.": "invalidTshirt",
};
const SERVER_ERRORS_TR = {
  "Payment information has not been set up yet.": ["পেমেন্টের তথ্য এখনো যোগ করা হয়নি। অ্যাডমিনকে জানান।", "Payment details have not been set up yet. Please tell the admin."],
  "Invalid payment method.": ["পেমেন্ট মাধ্যম সঠিক নয়। পেজটি রিলোড করুন।", "Invalid payment method. Please reload the page."],
};

function serverError(lang, status, data) {
  let text;
  if (status === 429) text = t(lang, "tooMany");
  else if (status === 413) text = t(lang, "largePhoto");
  else if (data?.error?.startsWith?.("Security rate-limit")) text = t(lang, "setupIncomplete");
  else if (SERVER_ERRORS[data?.error]) text = t(lang, SERVER_ERRORS[data.error]);
  else if (SERVER_ERRORS_TR[data?.error]) text = tr(lang, ...SERVER_ERRORS_TR[data.error]);
  else text = status >= 500 ? t(lang, "serverBusy") : t(lang, "saveFailed");
  return data?.code ? `${text} (${tr(lang, "কোড", "code")}: ${data.code})` : text;
}

/* ---------- small UI pieces ---------- */
function CopyField({ label, value, lang, big }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (await copyText(value)) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }
  return (
    <div className="copy-row">
      <div><small>{label}</small><span className={big ? "num" : "copy-value"}>{value}</span></div>
      <button type="button" className="btn ghost small" onClick={copy}>{copied ? t(lang, "copied") : t(lang, "copy")}</button>
    </div>
  );
}

const methodLabel = (id, lang) => (id === "bank" ? tr(lang, "ব্যাংক", "Bank") : id === "nagad" ? "Nagad" : "bKash");

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
      <div className="lamp-scene" aria-label={tr(lang, "আলো জ্বালাতে ল্যাম্পের দড়ি টানুন", "Pull the lamp cord to turn on the registration light")}>
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
        <div className="lamp-scene-copy"><span className="lamp-eyebrow">REUNION 2027 · REGISTRATION</span><strong>{on ? tr(lang, "আলো জ্বলে উঠেছে!", "You're all set to register!") : tr(lang, "একটু আলো জ্বালান", "Let’s light up your memories")}</strong><small>{on ? tr(lang, "পাশে আপনার নিবন্ধন ফর্মটি পূরণ করুন", "Your registration form is ready beside the lamp") : tr(lang, "ল্যাম্পের দড়ি নিচে টানুন", "Pull down the cord to reveal the form")}</small></div>
        <button type="button" className="lamp-accessible-toggle" onClick={toggle} aria-pressed={on}>{on ? tr(lang, "আলো বন্ধ করুন", "Turn light off") : tr(lang, "লাইট অন করুন", "Turn light on")}</button>
      </div>
      <div className="lamp-form-reveal" aria-hidden={!on} inert={!on}>
        {children}
      </div>
    </section>
  );
}

export default function RegisterForm({ pay, lang = "bn", emailEnabled = true, emailRequired = true, tshirtEnabled = false, tshirtRequired = false, tshirtSizes = ["S","M","L","XL","XXL","XXXL"] }) {
  const methods = pay.methods || [];
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY);
  const [method, setMethod] = useState(methods[0]?.id || "");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [done, setDone] = useState(null);
  const previewRef = useRef("");
  const loaded = useRef(false);
  const nf = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { useGrouping: false });
  const amountText = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US").format(pay.amount || 0);

  // Keep typed text (not the photo) if the page is accidentally refreshed.
  useEffect(() => {
    try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); if (d) setForm({ ...EMPTY, ...d }); } catch {}
    loaded.current = true;
    return () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); };
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
  }, [form]);

  const set = (key, transform = (v) => v) => (e) => setForm((f) => ({ ...f, [key]: transform(e.target.value) }));
  const digits4 = (v) => normalizeDigits(v).replace(/\D/g, "").slice(0, 4);
  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setPhotoBusy(true);
    try {
      const blob = await compress(file);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(blob);
      previewRef.current = url;
      setPhoto(blob); setPreview(url);
    } catch {
      setPhoto(null); setPreview("");
      setErr(t(lang, "photoProcessError"));
    } finally { setPhotoBusy(false); }
  }

  function bad(id, key) {
    setErr(t(lang, key));
    document.getElementById(id)?.focus();
    return false;
  }
  const clean = () => ({
    full_name: form.full_name.normalize("NFC").trim().replace(/\s+/g, " "),
    ssc_batch: normalizeDigits(form.ssc_batch).trim(),
    profession: form.profession.normalize("NFC").trim(),
    phone: normalizePhone(form.phone),
    email: emailEnabled ? form.email.trim().toLowerCase() : "",
    tshirt_size: tshirtEnabled ? form.tshirt_size : "",
    trx_id: normalizeTrx(form.trx_id),
  });

  function validateStep1(v) {
    const year = new Date().getFullYear();
    if (v.full_name.length < 3 || v.full_name.length > 80 || /[<>]/.test(v.full_name)) return bad("full_name", "invalidName");
    if (!/^\d{4}$/.test(v.ssc_batch) || +v.ssc_batch < 1940 || +v.ssc_batch > year) return bad("ssc_batch", "invalidBatch");
    if (v.profession.length < 2 || v.profession.length > 100 || /[<>]/.test(v.profession)) return bad("profession", "invalidProfession");
    if (!PHONE_RE.test(v.phone)) return bad("phone", "invalidPhone");
    if (emailEnabled && emailRequired && !v.email) return bad("email", "requiredEmail");
    if (emailEnabled && v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return bad("email", "invalidEmail");
    if (tshirtEnabled && tshirtRequired && !v.tshirt_size) return bad("tshirt_size", "requiredTshirt");
    if (tshirtEnabled && v.tshirt_size && !tshirtSizes.includes(v.tshirt_size)) return bad("tshirt_size", "invalidTshirt");
    if (!photo) return bad("photo", "choosePhoto");
    return true;
  }

  function next(e) {
    e.preventDefault();
    if (photoBusy) return;
    setErr("");
    const v = clean();
    if (!validateStep1(v)) return;
    setForm((f) => ({ ...f, ...v }));
    setStep(2); top();
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    const v = clean();
    if (!validateStep1(v)) { setStep(1); return; }
    if (!methods.length || !method) return setErr(tr(lang, "পেমেন্টের তথ্য এখনো যোগ করা হয়নি।", "Payment details have not been set up yet."));
    if (!TRX_RE.test(v.trx_id)) return bad("trx_id", "invalidTrx");

    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.set(k, val));
    fd.set("pay_method", method);
    fd.set("photo", photo, "photo.jpg");
    setBusy(true);
    try {
      const r = await fetch("/api/register", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(serverError(lang, r.status, j)); return; }
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      setDone({ trx: v.trx_id, regCode: j.reg_code || null, emailSent: j.email_sent === true, emailQueued: j.email_queued === true, emailSkipped: j.email_skipped === true });
      top();
    } catch { setErr(t(lang, "networkError")); }
    finally { setBusy(false); }
  }

  if (done)
    return (
      <div className="card success-card" role="status">
        <Confetti />
        <div className="state-icon ok tick" aria-hidden="true"><svg viewBox="0 0 52 52" focusable="false"><circle cx="26" cy="26" r="23" /><path d="M15 27.5l8 8L38 18" /></svg></div>
        <h2>{t(lang, "sent")}</h2>
        <p>{t(lang, "sentNote")}</p>
        <div className="status-reference"><span>{tr(lang, "নিবন্ধন নম্বর", "Registration Number")}</span><b>{done.regCode || tr(lang, "অনুমোদনের পর দেওয়া হবে", "Assigned after approval")}</b></div>
        <div className="status-reference"><span>TrxID</span><b>{done.trx}</b></div>
        {emailEnabled && <p className="muted">{done.emailSkipped
          ? tr(lang, "ইমেইল ঠিকানা দেওয়া হয়নি, তাই ইমেইল পাঠানো হয়নি।", "No email address was provided, so no email was sent.")
          : done.emailSent
            ? tr(lang, "নিবন্ধনের নিশ্চিতকরণ ইমেইল পাঠানো হয়েছে। অনুমোদনের পর ID নম্বর তৈরি হবে।", "Your confirmation email has been sent. Your registration ID will be assigned after approval.")
            : done.emailQueued
              ? tr(lang, "ইমেইল এখনো পাঠানো যায়নি; queue-তে রেখে পুনরায় পাঠানোর ব্যবস্থা করা হয়েছে।", "Email could not be sent immediately; it has been queued for retry.")
              : tr(lang, "নিবন্ধন সংরক্ষিত হয়েছে, তবে ইমেইল queue করা যায়নি। TrxID ও ফোন নম্বর সংরক্ষণ করুন।", "Your registration is saved, but the email could not be queued. Keep your TrxID and phone number.")}</p>}
        <p className="muted">{tr(lang, "আপনার TrxID ও নিবন্ধিত ফোন নম্বর সংরক্ষণ করে রাখুন — স্ট্যাটাস দেখতে দুটোই লাগবে।", "Keep your TrxID and registered phone number — you need both to check your status.")}</p>
        <div className="row" style={{ justifyContent: "center" }}><Link className="btn" href="/status">{t(lang, "checkStatus")}</Link></div>
      </div>
    );

  const current = methods.find((m) => m.id === method);
  const trxLabel = method === "bank" ? tr(lang, "ট্রানজ্যাকশন / রেফারেন্স নম্বর", "Transaction / reference number") : t(lang, "trx");

  return (
    <div className="reg-form">
      <LampReveal lang={lang}>
      <ol className="stepper" aria-label={tr(lang, "নিবন্ধনের ধাপ", "Registration steps")}>
        <li className={step === 1 ? "is-current" : "is-done"} aria-current={step === 1 ? "step" : undefined}><i>{step > 1 ? "✓" : nf.format(1)}</i><span>{tr(lang, "আপনার তথ্য", "Your details")}</span></li>
        <li className={step === 2 ? "is-current" : ""} aria-current={step === 2 ? "step" : undefined}><i>{nf.format(2)}</i><span>{tr(lang, "পেমেন্ট", "Payment")}</span></li>
      </ol>

      {/* ---------- Step 1: personal details ---------- */}
      <form onSubmit={next} noValidate hidden={step !== 1}>
        <div className="form-card registration-form-card">
          <div className="registration-form-intro"><span className="registration-form-kicker">{tr(lang, "আপনার তথ্য", "YOUR DETAILS")}</span><p>{tr(lang, "সঠিক তথ্য দিয়ে ফর্মটি পূরণ করুন। * চিহ্নিত ঘরগুলো বাধ্যতামূলক।", "Please enter your details carefully. Fields marked * are required.")}</p></div>
          <div className="registration-fields-grid">
            <div className="registration-field"><label htmlFor="full_name">{t(lang, "fullName")} *</label><input id="full_name" name="full_name" autoComplete="name" required maxLength={80} value={form.full_name} onChange={set("full_name")} placeholder={tr(lang, "আপনার পূর্ণ নাম লিখুন", "Enter your full name")} /></div>
            <div className="registration-field"><label htmlFor="ssc_batch">{t(lang, "batch")} *</label><input id="ssc_batch" name="ssc_batch" required inputMode="numeric" maxLength={4} placeholder="2010" value={form.ssc_batch} onChange={set("ssc_batch", digits4)} /></div>
            <div className="registration-field"><label htmlFor="profession">{t(lang, "profession")} *</label><input id="profession" name="profession" list="profession-options" required maxLength={100} placeholder={tr(lang, "যেমন: শিক্ষক, ইঞ্জিনিয়ার, শিক্ষার্থী", "e.g. Teacher, Engineer, Student")} value={form.profession} onChange={set("profession")} /><datalist id="profession-options">{["Student", "Teacher", "Engineer", "Doctor", "Business", "Government Job", "Private Job", "Freelancer", "Other"].map((o) => <option key={o} value={o} />)}</datalist></div>
            <div className="registration-field"><label htmlFor="phone">{t(lang, "mobile")} *</label><input id="phone" name="phone" type="tel" autoComplete="tel" required inputMode="numeric" maxLength={16} placeholder="017XXXXXXXX" value={form.phone} onChange={set("phone", normalizeDigits)} /></div>
            {emailEnabled && <div className="registration-field"><label htmlFor="email">{tr(lang, "ইমেইল ঠিকানা", "Email address")} {emailRequired ? "*" : tr(lang, "(ঐচ্ছিক)", "(optional)")}</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required={emailRequired} value={form.email} onChange={set("email")} placeholder="name@example.com" /></div>}
            {tshirtEnabled && <div className="registration-field"><label htmlFor="tshirt_size">{tr(lang, "T-shirt Size", "T-shirt Size")} {tshirtRequired ? "*" : tr(lang, "(ঐচ্ছিক)", "(optional)")}</label><select id="tshirt_size" name="tshirt_size" value={form.tshirt_size} required={tshirtRequired} onChange={set("tshirt_size")}><option value="">{tr(lang, "সাইজ নির্বাচন করুন", "Select size")}</option>{tshirtSizes.map(size => <option key={size} value={size}>{size}</option>)}</select></div>}
            <div className="registration-field registration-field-wide photo-upload-field"><label htmlFor="photo">{t(lang, "photo")} *</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} /><small className="hint">{t(lang, "photoHint")}</small>{photoBusy && <p className="muted" role="status">{t(lang, "loading")}</p>}{preview && <p className="photo-preview"><img className="avatar" src={preview} alt={tr(lang, "ছবির প্রিভিউ", "Photo preview")} /><span>{Math.round(photo.size / 1024)} KB ✓</span></p>}</div>
            {err && step === 1 && <p className="error-panel registration-field-wide" role="alert">{err}</p>}
            <div className="registration-actions"><button className="btn" disabled={photoBusy}>{tr(lang, "পরবর্তী ধাপ: পেমেন্ট →", "Next: Payment →")}</button></div>
          </div>
        </div>
      </form>

      {/* ---------- Step 2: payment ---------- */}
      <form onSubmit={submit} noValidate hidden={step !== 2}>
        <div className="card summary">
          {preview && <img className="avatar small" src={preview} alt="" />}
          <div><b>{form.full_name}</b><span className="muted">{t(lang, "ssc")} {form.ssc_batch} · {form.profession}</span></div>
          <button type="button" className="btn ghost small" onClick={() => { setErr(""); setStep(1); top(); }}>{tr(lang, "সম্পাদনা", "Edit")}</button>
        </div>

        <div className="card pay-amount">
          <span>{tr(lang, "পরিশোধযোগ্য ফি", "Fee to pay")}</span>
          <b>৳ {amountText}</b>
        </div>

        <div className="form-card">
          {methods.length === 0 ? (
            <p className="error-panel">{tr(lang, "পেমেন্টের তথ্য এখনো যোগ করা হয়নি। অনুগ্রহ করে অ্যাডমিনের সঙ্গে যোগাযোগ করুন।", "Payment details have not been added yet. Please contact the admin.")}</p>
          ) : (
            <>
              <div className="pay-tabs" role="radiogroup" aria-label={tr(lang, "পেমেন্ট মাধ্যম", "Payment method")}>
                {methods.map((m) => (
                  <label key={m.id} className={"pay-tab" + (method === m.id ? " active" : "")}>
                    <input type="radio" name="pay_method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <span>{methodLabel(m.id, lang)}</span>
                  </label>
                ))}
              </div>

              {current && (current.id === "bank" ? (
                <div className="pay-box">
                  <p>{tr(lang, "নিচের ব্যাংক অ্যাকাউন্টে টাকা জমা/ট্রান্সফার করুন:", "Deposit or transfer the fee to this bank account:")}</p>
                  {current.bankName && <div className="kv"><small>{tr(lang, "ব্যাংক", "Bank")}</small><span>{current.bankName}</span></div>}
                  {current.branch && <div className="kv"><small>{tr(lang, "শাখা", "Branch")}</small><span>{current.branch}</span></div>}
                  {current.accountName && <CopyField label={tr(lang, "অ্যাকাউন্টের নাম", "Account name")} value={current.accountName} lang={lang} />}
                  <CopyField label={tr(lang, "অ্যাকাউন্ট নম্বর", "Account number")} value={current.accountNumber} lang={lang} big />
                  {current.routing && <CopyField label={tr(lang, "রাউটিং নম্বর", "Routing number")} value={current.routing} lang={lang} />}
                  {current.note && <p className="muted">{current.note}</p>}
                </div>
              ) : (
                <div className="pay-box">
                  <p>{tr(lang, `নিচের ${methodLabel(current.id, lang)} নম্বরে ফি পাঠান:`, `Send the fee to this ${methodLabel(current.id, lang)} number:`)}</p>
                  <CopyField label={`${methodLabel(current.id, lang)} ${tr(lang, "নম্বর", "number")}`} value={current.number} lang={lang} big />
                </div>
              ))}
              {pay.note && <p className="pay-note">{pay.note}</p>}

              <div className="registration-field registration-field-wide trx-field"><label htmlFor="trx_id">{trxLabel} *</label><input id="trx_id" name="trx_id" required maxLength={40} autoComplete="off" autoCapitalize="characters" value={form.trx_id} onChange={set("trx_id", normalizeTrx)} /><small className="hint">{tr(lang, "টাকা পাঠানোর পর SMS বা অ্যাপে পাওয়া ট্রানজ্যাকশন আইডি এখানে লিখুন।", "Enter the transaction ID you received by SMS or in the app after paying.")}</small></div>
            </>
          )}

          {err && step === 2 && <p className="error-panel" role="alert">{err}</p>}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => { setErr(""); setStep(1); top(); }}>← {tr(lang, "পেছনে", "Back")}</button>
            <button className="btn" disabled={busy || !methods.length}>{busy ? t(lang, "sending") : t(lang, "submit")}</button>
          </div>
        </div>
      </form>
      </LampReveal>
    </div>
  );
}
