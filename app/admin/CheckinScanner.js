"use client";
import { useEffect, useRef, useState } from "react";
import { tr } from "../../lib/i18n";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Accepts a QR token (UUID), a URL containing ?token=, or a printed registration ID like REU-0012. */
export function parseLookup(value) {
  let raw = String(value || "").trim();
  if (/^https?:/i.test(raw)) { try { raw = new URL(raw).searchParams.get("token") || raw; } catch {} }
  raw = raw.replace(/^reunion-checkin:/i, "").trim();
  if (UUID_RE.test(raw)) return { token: raw };
  const m = raw.toUpperCase().replace(/\s/g, "").match(/^REU-?(\d{1,6})$/);
  if (m) return { code: "REU-" + m[1].padStart(4, "0") };
  return null;
}

export default function CheckinScanner({ lang = "en" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const verifyRef = useRef(null);
  const [camera, setCamera] = useState(false);
  const [value, setValue] = useState("");
  const [result, setResult] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null; setCamera(false);
  }

  useEffect(() => {
    if (!camera || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    let active = true, frame = 0;
    video.srcObject = streamRef.current;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const scan = async () => {
      if (!active) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length && codes[0].rawValue) {
          const raw = codes[0].rawValue.trim();
          setValue(raw); stopCamera();
          verifyRef.current?.(raw);
          return;
        }
      } catch {}
      if (active) frame = requestAnimationFrame(scan);
    };
    const begin = () => video.play().then(() => { if (active) frame = requestAnimationFrame(scan); }).catch(() => setError(tr(lang, "ক্যামেরা চালু করা যায়নি।", "Could not start the camera preview.")));
    if (video.readyState >= 1) begin(); else video.onloadedmetadata = begin;
    return () => { active = false; if (frame) cancelAnimationFrame(frame); video.onloadedmetadata = null; video.srcObject = null; };
  }, [camera, lang]);
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  async function startCamera() {
    setError(""); setResult(null);
    if (!("BarcodeDetector" in window)) return setError(tr(lang, "এই ব্রাউজারে ক্যামেরা QR স্ক্যান চলে না। Android-এ Chrome ব্যবহার করুন, অথবা নিচে রেজিস্ট্রেশন আইডি (যেমন REU-0012) লিখে যাচাই করুন।", "This browser cannot scan QR codes with the camera. Use Chrome on Android, or type the registration ID (e.g. REU-0012) below."));
    if (!navigator.mediaDevices?.getUserMedia) return setError(tr(lang, "ক্যামেরার জন্য HTTPS বা localhost দরকার। অথবা আইডি/টোকেন হাতে লিখুন।", "Camera needs HTTPS or localhost. Or enter the ID/token manually."));
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setCamera(true);
    } catch { setError(tr(lang, "ক্যামেরার অনুমতি পাওয়া যায়নি। অনুমতি দিন, অথবা আইডি/টোকেন হাতে লিখুন।", "Camera permission was denied or no camera is available. Allow access, or enter the ID/token manually.")); }
  }

  async function call(action, parsed) {
    const r = await fetch("/api/admin/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...parsed }) });
    const j = await r.json().catch(() => ({}));
    return { r, j };
  }

  async function verify(raw) {
    const parsed = parseLookup(raw ?? value);
    setError(""); setResult(null);
    if (!parsed) return setError(tr(lang, "QR টোকেন বা আইডি সঠিক নয়। (উদাহরণ: REU-0012)", "Invalid QR token or ID (example: REU-0012)."));
    setBusy(true);
    try {
      const { r, j } = await call("verify", parsed);
      if (!r.ok) throw new Error(r.status === 404 ? tr(lang, "এই QR/আইডি পাওয়া যায়নি।", "QR/ID not found.") : r.status === 409 ? tr(lang, "এই নিবন্ধন অনুমোদিত নয়।", "This registration is not approved.") : r.status === 401 ? tr(lang, "সেশন শেষ। আবার লগইন করুন।", "Session expired. Please log in again.") : tr(lang, "যাচাই করা যায়নি।", "Could not verify."));
      setLookup(parsed); setResult(j);
    } catch (e) { setError(e.message || tr(lang, "নেটওয়ার্ক সমস্যা।", "Network error.")); }
    finally { setBusy(false); }
  }
  verifyRef.current = verify;

  async function mark() {
    if (!result?.registration || result.already_attended || !lookup) return;
    setBusy(true); setError("");
    try {
      const { r, j } = await call("attend", lookup);
      if (!r.ok && !j.already_attended) throw new Error(tr(lang, "উপস্থিতি চিহ্নিত করা যায়নি।", "Could not mark attendance."));
      setResult({ ok: true, registration: { ...result.registration, ...(j.registration || {}), attended_at: j.registration?.attended_at || j.attended_at || new Date().toISOString() }, already_attended: true, justMarked: r.ok });
    } catch (e) { setError(e.message || tr(lang, "নেটওয়ার্ক সমস্যা।", "Network error.")); }
    finally { setBusy(false); }
  }

  function reset() { setResult(null); setLookup(null); setValue(""); setError(""); }
  const reg = result?.registration;

  return <section className="card scanner-card">
    <div className="scanner-title">
      <div>
        <span className="eyebrow">{tr(lang, "অনুষ্ঠানের দিন", "EVENT DAY")}</span>
        <h2>{tr(lang, "QR চেক-ইন ও উপস্থিতি", "QR Check-in & Attendance")}</h2>
        <p className="muted">{tr(lang, "QR স্ক্যান করুন বা রেজিস্ট্রেশন আইডি লিখুন, তথ্য মিলিয়ে উপস্থিতি চিহ্নিত করুন।", "Scan the QR or type the registration ID, verify the details, then mark attendance.")}</p>
      </div>
      <span className="scanner-icon" aria-hidden="true">▦</span>
    </div>

    {camera && <video ref={videoRef} className="scanner-video" playsInline muted />}
    <div className="row"><button type="button" className="btn" onClick={camera ? stopCamera : startCamera}>{camera ? tr(lang, "ক্যামেরা বন্ধ করুন", "Stop camera") : tr(lang, "QR স্ক্যানার চালু করুন", "Open QR scanner")}</button></div>

    <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="scanner-form">
      <label htmlFor="qr-value">{tr(lang, "রেজিস্ট্রেশন আইডি বা QR টোকেন", "Registration ID or QR token")}</label>
      <input id="qr-value" value={value} onChange={(e) => setValue(e.target.value)} placeholder="REU-0012" autoCapitalize="characters" autoComplete="off" required />
      <div className="row"><button className="btn" disabled={busy || !value.trim()}>{busy ? tr(lang, "যাচাই হচ্ছে…", "Checking…") : tr(lang, "যাচাই করুন", "Verify")}</button></div>
    </form>

    {error && <p className="error-panel" role="alert">{error}</p>}
    {reg && <div className="checkin-result" role="status">
      <span className="badge approved">{tr(lang, "যাচাইকৃত নিবন্ধন", "Verified registration")}</span>
      <h3>{reg.full_name}</h3>
      <p>{tr(lang, "এসএসসি ব্যাচ", "SSC Batch")}: {reg.ssc_batch}</p>
      <p>{tr(lang, "পেশা", "Profession")}: {reg.profession || "—"}</p>
      <p>{tr(lang, "রেজিস্ট্রেশন আইডি", "Registration ID")}: <b>{reg.reg_code}</b></p>
      {result.already_attended
        ? <p className="success-panel">✓ {result.justMarked ? tr(lang, "উপস্থিতি চিহ্নিত হয়েছে।", "Attendance marked.") : tr(lang, "আগেই উপস্থিত চিহ্নিত করা হয়েছে", "Attendance was already marked")}{!result.justMarked && reg.attended_at ? ` (${new Date(reg.attended_at).toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "Asia/Dhaka" })})` : ""}</p>
        : <button type="button" className="btn ok" disabled={busy} onClick={mark}>{busy ? tr(lang, "সংরক্ষণ হচ্ছে…", "Saving…") : tr(lang, "উপস্থিত চিহ্নিত করুন", "Mark as attended")}</button>}
      <div className="row"><button type="button" className="btn ghost" onClick={reset}>{tr(lang, "পরবর্তী জন", "Next person")}</button></div>
    </div>}
  </section>;
}
