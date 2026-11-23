"use client";

import { useEffect, useState } from "react";
import { tr } from "../lib/i18n";

const slides = ["/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];

export default function HeroSlider({ lang = "en" }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 3500);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="hero-slider" aria-label={tr(lang, "পুনর্মিলনী ২০২৭ ছবির স্লাইডার", "Reunion 2027 image slider")}>
      {slides.map((src, index) => (
        <img key={src} className={`hero-slide${active === index ? " is-active" : ""}`} src={src}
          alt={tr(lang, `গঙ্গানন্দপুর বিদ্যালয়ের পুনর্মিলনী ২০২৭ — ছবি ${index + 1}`, `Ganganandapur school Reunion 2027 — image ${index + 1}`)}
          aria-hidden={active !== index} />
      ))}
      <div className="hero-slide-dots" aria-hidden="true">
        {slides.map((src, index) => <span key={src} className={active === index ? "active" : ""} />)}
      </div>
    </div>
  );
}
