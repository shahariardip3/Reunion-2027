"use client";
import { useState } from "react";
import { tr } from "../lib/i18n";
import { copyText } from "../lib/clipboard";

const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function buildIcs({ date, title, venue, url }) {
  const [y, m, d] = date.split("-").map(Number);
  const ymd = (dt) => `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
  const start = new Date(Date.UTC(y, m - 1, d)), end = new Date(Date.UTC(y, m - 1, d + 1));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ganganandapur Reunion//BN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:reunion-${date}@ganganandapur`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:${esc(title)}`, venue ? `LOCATION:${esc(venue)}` : null, `DESCRIPTION:${esc(url)}`, "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export default function ShareButtons({ lang = "bn", date, title, venue }) {
  const [note, setNote] = useState("");
  const flash = (text) => { setNote(text); setTimeout(() => setNote(""), 2500); };

  async function share() {
    const url = window.location.origin;
    const data = { title, text: tr(lang, `${title} — আপনিও নিবন্ধন করুন!`, `${title} — register now!`), url };
    if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e?.name === "AbortError") return; } }
    flash((await copyText(url)) ? tr(lang, "লিংক কপি হয়েছে ✓", "Link copied ✓") : url);
  }

  function addToCalendar() {
    const blob = new Blob([buildIcs({ date, title, venue, url: window.location.origin })], { type: "text/calendar;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href; a.download = "reunion-2027.ics"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
  }

  return (
    <div className="share-row">
      <button type="button" className="btn ghost small" onClick={share}>🔗 {tr(lang, "বন্ধুদের জানান", "Share")}</button>
      {date && <button type="button" className="btn ghost small" onClick={addToCalendar}>📅 {tr(lang, "ক্যালেন্ডারে যোগ করুন", "Add to calendar")}</button>}
      {note && <span className="share-note" role="status">{note}</span>}
    </div>
  );
}
