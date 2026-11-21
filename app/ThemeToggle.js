"use client";
import { useEffect, useState } from "react";

/** Light is the default; visitors can switch themes and the choice is remembered. */
export default function ThemeToggle({ lang = "bn" }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
  }, []);

  function toggle() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { window.localStorage.setItem("theme", next); } catch { /* Storage can be disabled. */ }
      return next;
    });
  }

  const label = theme === "dark"
    ? (lang === "bn" ? "লাইট থিমে যান" : "Switch to light theme")
    : (lang === "bn" ? "ডার্ক থিমে যান" : "Switch to dark theme");

  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={label} title={label} aria-pressed={theme === "dark"}>
      <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
    </button>
  );
}
