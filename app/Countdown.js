"use client";
import { useEffect, useState } from "react";
import { t } from "../lib/i18n";

// Event day runs 00:00–24:00 Bangladesh time (UTC+6).
function compute(date) {
  const start = new Date(`${date}T00:00:00+06:00`).getTime();
  if (Number.isNaN(start)) return null;
  const now = Date.now();
  if (now >= start + 86400000) return { over: true };
  if (now >= start) return { today: true };
  let s = Math.floor((start - now) / 1000);
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60);
  return { d, h, m, s: s % 60 };
}

export default function Countdown({ date, lang = "en" }) {
  const [p, setP] = useState(null);
  useEffect(() => {
    setP(compute(date));
    const id = setInterval(() => setP(compute(date)), 1000);
    return () => clearInterval(id);
  }, [date]);

  if (!p || p.over) return null;
  if (p.today) return <div className="count-today" role="status">{t(lang, "eventToday")}</div>;

  const locale = lang === "bn" ? "bn-BD" : "en-US";
  const num = (n, pad) => new Intl.NumberFormat(locale, { minimumIntegerDigits: pad ? 2 : 1, useGrouping: false }).format(n);
  const units = [
    [num(p.d), "dayUnit"], [num(p.h, true), "hourUnit"], [num(p.m, true), "minUnit"], [num(p.s, true), "secUnit"],
  ];
  return (
    <div className="count" role="timer" aria-label={`${num(p.d)} ${t(lang, "days")}`}>
      {units.map(([value, key]) => (
        <div className="count-box" key={key}><b>{value}</b><span>{t(lang, key)}</span></div>
      ))}
    </div>
  );
}
