"use client";
import { useEffect, useState } from "react";

const SIZES = ["md", "lg", "xl"];

/** Text-size control for readers who find small type hard to read. Choice is remembered on this device. */
export default function FontSizeToggle({ lang = "bn" }) {
  const [size, setSize] = useState("md");

  useEffect(() => {
    const current = document.documentElement.dataset.fs;
    setSize(SIZES.includes(current) ? current : "md");
  }, []);

  function cycle() {
    setSize((current) => {
      const next = SIZES[(SIZES.indexOf(current) + 1) % SIZES.length];
      document.documentElement.dataset.fs = next;
      try { window.localStorage.setItem("fs", next); } catch { /* Storage can be disabled. */ }
      return next;
    });
  }

  const label = lang === "bn" ? "লেখার আকার বদলান" : "Change text size";
  return (
    <button type="button" className="theme-toggle fs-toggle" onClick={cycle} aria-label={`${label} (${size === "md" ? "100%" : size === "lg" ? "112%" : "125%"})`} title={label}>
      <span aria-hidden="true" data-size={size}>A<small>{size === "md" ? "+" : size === "lg" ? "++" : "↺"}</small></span>
    </button>
  );
}
