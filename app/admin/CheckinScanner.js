
"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "../../lib/i18n";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Accept QR token, URL containing ?token=, or registration ID. */
export function parseLookup(value) {
  let raw = String(value || "").trim();

  if (/^https?:/i.test(raw)) {
    try {
      raw = new URL(raw).searchParams.get("token") || raw;
    } catch {}
  }

  raw = raw.replace(/^reunion-checkin:/i, "").trim();

  if (UUID_RE.test(raw)) return { token: raw };

  const match = raw
    .toUpperCase()
    .replace(/\s/g, "")
    .match(/^REU-?(\d{1,6})$/);

  if (match) {
    return { code: "REU-" + match[1].padStart(4, "0") };
  }

  return null;
}

/** Sound + vibration so a gate volunteer knows the result without looking at the screen. kind: ok | warn | bad */
function feedback(kind) {
  try {
    if (navigator.vibrate) navigator.vibrate(kind === "ok" ? 60 : kind === "warn" ? [80, 60, 80] : [200, 80, 200]);
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "ok" ? 880 : kind === "warn" ? 520 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (kind === "ok" ? 0.12 : 0.3));
    osc.onended = () => ctx.close();
  } catch { /* Audio/vibration are best-effort. */ }
}

export default function CheckinScanner({ lang = "en", tshirtEnabled = false }) {
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
    streamRef.current = null;
    setCamera(false);
  }

  useEffect(() => {
    if (!camera || !videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    let active = true;
    let frame = 0;

    video.srcObject = streamRef.current;

    // Chrome on Android/macOS has a built-in QR detector; desktop Chrome/Firefox/Safari do not,
    // so everywhere else the QR code is decoded in JavaScript (jsQR) from the camera frames.
    let nativeDetector = null;
    try {
      if ("BarcodeDetector" in window) nativeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch { nativeDetector = null; }
    let decodeFrame = null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const finish = (raw) => {
      const text = String(raw || "").trim();
      if (!text) return false;
      setValue(text);
      stopCamera();
      verifyRef.current?.(text);
      return true;
    };

    const scan = async () => {
      if (!active) return;

      try {
        if (video.readyState >= 2 && video.videoWidth) {
          if (nativeDetector) {
            const codes = await nativeDetector.detect(video);
            if (codes.length && finish(codes[0].rawValue)) return;
          } else {
            if (!decodeFrame) decodeFrame = (await import("jsqr")).default;
            if (!active) return;
            const scale = Math.min(1, 720 / video.videoWidth);
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = decodeFrame(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
            if (code?.data && finish(code.data)) return;
          }
        }
      } catch {}

      // jsQR is heavier than the native detector, so look ~8 times a second instead of every frame.
      if (active) frame = nativeDetector ? requestAnimationFrame(scan) : window.setTimeout(scan, 120);
    };

    const begin = () => {
      video.play().then(() => {
        if (active) frame = nativeDetector ? requestAnimationFrame(scan) : window.setTimeout(scan, 120);
      }).catch(() => {
        setError(
          tr(lang, "ক্যামেরা চালু করা যায়নি।", "Could not start the camera preview.")
        );
      });
    };

    if (video.readyState >= 1) {
      begin();
    } else {
      video.onloadedmetadata = begin;
    }

    return () => {
      active = false;
      if (frame) { cancelAnimationFrame(frame); clearTimeout(frame); }
      video.onloadedmetadata = null;
      video.srcObject = null;
    };
  }, [camera, lang]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    setError("");
    setResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      return setError(
        tr(lang, "ক্যামেরার জন্য HTTPS (নিরাপদ ঠিকানা) দরকার।", "The camera needs a secure (HTTPS) address.")
      );
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setCamera(true);
    } catch {
      setError(
        tr(lang, "ক্যামেরার অনুমতি পাওয়া যায়নি।", "Camera permission denied or unavailable.")
      );
    }
  }

  async function call(action, parsed) {
    const response = await fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...parsed }),
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  }

  async function verify(raw) {
    const parsed = parseLookup(raw ?? value);

    setError("");
    setResult(null);

    if (!parsed) {
      return setError(
        tr(lang, "QR টোকেন বা ID সঠিক নয়। উদাহরণ: REU-0012", "Invalid QR token or ID. Example: REU-0012.")
      );
    }

    setBusy(true);

    try {
      const { response, data } = await call("verify", parsed);

      if (!response.ok) {
        throw new Error(
          data.error ||
          (response.status === 404
            ? tr(lang, "এই QR/ID পাওয়া যায়নি।", "QR/ID not found.")
            : response.status === 401
            ? tr(lang, "আবার Admin Login করুন।", "Please log in again.")
            : tr(lang, "যাচাই করা যায়নি।", "Could not verify."))
        );
      }

      setLookup(parsed);
      setResult(data);
      feedback(data?.registration?.attended_at ? "warn" : "ok");
    } catch (err) {
      setError(err.message || tr(lang, "নেটওয়ার্ক সমস্যা।", "Network error."));
      feedback("bad");
    } finally {
      setBusy(false);
    }
  }

  verifyRef.current = verify;

  async function markAction(action) {
    if (!result?.registration || !lookup || busy) return;

    const reg = result.registration;

    const column =
      action === "attend"
        ? "attended_at"
        : action === "gift"
        ? "gift_received_at"
        : "food_received_at";

    if (reg[column]) return;

    setBusy(true);
    setError("");

    try {
      const { response, data } = await call(action, lookup);

      if (!response.ok) {
        throw new Error(
          data.error || data.message ||
          tr(lang, "তথ্য সংরক্ষণ করা যায়নি।", "Could not save information.")
        );
      }

      setResult({
        ...result,
        registration: {
          ...reg,
          ...(data.registration || {}),
          [column]: data.registration?.[column] || new Date().toISOString(),
        },
      });
    } catch (err) {
      setError(err.message || tr(lang, "নেটওয়ার্ক সমস্যা।", "Network error."));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setLookup(null);
    setValue("");
    setError("");
    stopCamera();
  }

  const reg = result?.registration;

  function ActionStatus({ label, received, onClick, buttonText }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          padding: "12px",
          marginTop: "10px",
          border: "1px solid var(--border, #ddd)",
          borderRadius: "10px",
        }}
      >
        <div>
          <strong>{label}</strong>
          <div style={{
            marginTop: "5px",
            fontSize: "13px",
            color: received ? "green" : "var(--muted, #777)",
          }}>
            {received
              ? tr(lang, "✓ সম্পন্ন হয়েছে", "✓ Completed")
              : tr(lang, "এখনো Mark করা হয়নি", "Not marked yet")}
          </div>
        </div>

        {received ? (
          <span className="badge approved">
            {tr(lang, "সম্পন্ন", "Completed")}
          </span>
        ) : (
          <button
            type="button"
            className="btn ok"
            disabled={busy}
            onClick={onClick}
          >
            {busy
              ? tr(lang, "সংরক্ষণ হচ্ছে…", "Saving…")
              : buttonText}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="card scanner-card">
      <div className="scanner-title">
        <div>
          <span className="eyebrow">
            {tr(lang, "অনুষ্ঠানের দিন", "EVENT DAY")}
          </span>
          <h2>
            {tr(lang, "QR স্ক্যান ও ইভেন্ট ম্যানেজমেন্ট", "QR Scan & Event Management")}
          </h2>
          <p className="muted">
            {tr(lang, "QR স্ক্যান করুন অথবা Registration ID লিখুন।", "Scan QR or enter Registration ID.")}
          </p>
        </div>
        <span className="scanner-icon" aria-hidden="true">▦</span>
      </div>

      {camera && (
        <video
          ref={videoRef}
          className="scanner-video"
          playsInline
          muted
        />
      )}

      <div className="row">
        <button
          type="button"
          className="btn"
          onClick={camera ? stopCamera : startCamera}
        >
          {camera
            ? tr(lang, "ক্যামেরা বন্ধ করুন", "Stop camera")
            : tr(lang, "QR স্ক্যানার চালু করুন", "Open QR scanner")}
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          verify();
        }}
        className="scanner-form"
      >
        <label htmlFor="qr-value">
          {tr(lang, "রেজিস্ট্রেশন আইডি বা QR টোকেন", "Registration ID or QR token")}
        </label>

        <input
          id="qr-value"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="REU-0012"
          autoCapitalize="characters"
          autoComplete="off"
          required
        />

        <div className="row">
          <button className="btn" disabled={busy || !value.trim()}>
            {busy
              ? tr(lang, "যাচাই হচ্ছে…", "Checking…")
              : tr(lang, "যাচাই করুন", "Verify")}
          </button>
        </div>
      </form>

      {error && <p className="error-panel" role="alert">{error}</p>}

      {reg && (
        <div className={`checkin-result ${reg.attended_at ? "is-repeat" : "is-fresh"}`} role="status">
          <span className="badge approved">
            {tr(lang, "যাচাইকৃত নিবন্ধন", "Verified registration")}
          </span>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginTop: "16px",
          }}>
            {reg.photo_url ? (
              <a href={reg.photo_url} target="_blank" rel="noreferrer">
                <img
                  src={reg.photo_url}
                  alt={reg.full_name || "Alumni"}
                  style={{
                    width: "116px",
                    height: "116px",
                    objectFit: "cover",
                    borderRadius: "12px",
                    border: "1px solid var(--border, #ddd)",
                  }}
                />
              </a>
            ) : (
              <div
                className="avatar placeholder"
                style={{ width: "116px", height: "116px", fontSize: "36px" }}
              >
                {Array.from(reg.full_name || "?")[0]}
              </div>
            )}

            <div style={{ flex: "1", minWidth: "180px" }}>
              <h3>{reg.full_name}</h3>
              <p>{tr(lang, "এসএসসি ব্যাচ", "SSC Batch")}: {reg.ssc_batch}</p>
              <p>{tr(lang, "পেশা", "Profession")}: {reg.profession || "—"}</p>
              <p>{tr(lang, "ফোন", "Phone")}: {reg.phone || "—"}</p>
              <p>{tr(lang, "ইমেইল", "Email")}: {reg.email || "—"}</p>
              {tshirtEnabled && <p>{tr(lang, "টি-শার্ট সাইজ", "T-shirt Size")}: <b>{reg.tshirt_size || "—"}</b></p>}
              <p>
                {tr(lang, "রেজিস্ট্রেশন আইডি", "Registration ID")}:{" "}
                <b>{reg.reg_code || "—"}</b>
              </p>
            </div>
          </div>

          <hr />

          <h3>
            {tr(lang, "ইভেন্ট রিসিভিং ম্যানেজমেন্ট", "Event Receiving Management")}
          </h3>

          <ActionStatus
            label="1. Attendance"
            received={!!reg.attended_at}
            onClick={() => markAction("attend")}
            buttonText={tr(lang, "উপস্থিতি Mark করুন", "Mark Attendance")}
          />

          <ActionStatus
            label="2. Gift Received"
            received={!!reg.gift_received_at}
            onClick={() => markAction("gift")}
            buttonText={tr(lang, "Gift Received Mark করুন", "Mark Gift Received")}
          />

          <ActionStatus
            label="3. Food Received"
            received={!!reg.food_received_at}
            onClick={() => markAction("food")}
            buttonText={tr(lang, "Food Received Mark করুন", "Mark Food Received")}
          />

          <div className="row" style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="btn ghost"
              onClick={reset}
              disabled={busy}
            >
              {tr(lang, "পরবর্তী Alumni", "Next Alumni")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
