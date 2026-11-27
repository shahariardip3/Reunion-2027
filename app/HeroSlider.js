"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tr } from "../lib/i18n";

const slides = [
  {
    src: "/images/hero-school-building.jpg",
    position: "center 52%",
    altBn: "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়ের ভবন",
    altEn: "The school building of Ganganandapur Secondary School"
  },
  {
    src: "/images/hero-school-gathering.jpg",
    position: "center 48%",
    altBn: "বিদ্যালয়ের একটি স্মরণীয় সমাবেশ",
    altEn: "A memorable gathering at the school"
  },
  {
    src: "/images/hero-morning-assembly.jpg",
    position: "center 48%",
    altBn: "বিদ্যালয়ের সকালের সমাবেশে শিক্ষার্থীরা",
    altEn: "Students at a morning assembly"
  },
  {
    src: "/images/school-gate-hero.webp",
    mobileSrc: "/images/school-gate-portrait.jpg",
    position: "center center",
    altBn: "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়ের প্রধান প্রবেশদ্বার",
    altEn: "The main entrance gate of Ganganandapur Secondary School"
  }
];

export default function HeroSlider({ lang = "en", title = "Reunion 2027", date = "", venue = "" }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 4600);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="hero-slider"
      aria-label={tr(lang, "পুনর্মিলনী ২০২৭ ছবির স্লাইডার", "Reunion 2027 image slider")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      {slides.map((slide, index) => (
        <picture
          key={slide.src}
          className={`hero-slide${active === index ? " is-active" : ""}`}
          aria-hidden={active !== index}
          style={{ "--slide-position": slide.position }}
        >
          {slide.mobileSrc && <source media="(max-width: 640px)" srcSet={slide.mobileSrc} />}
          <img
            className="hero-slide-image"
            src={slide.src}
            alt={tr(lang, slide.altBn, slide.altEn)}
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
          />
        </picture>
      ))}
      <div className="hero-slider-shade" aria-hidden="true" />
      <div className="hero-slider-content">
        <span className="hero-slider-kicker">
          {tr(lang, "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয় · পুনর্মিলনী ২০২৭", "GANGANANDAPUR HIGH SCHOOL · REUNION 2027")}
        </span>
        <p className="hero-slider-title">{tr(lang, "ফিরে চলি স্মৃতির সেই আঙিনায়", "Back to where our story began")}</p>
        <p>{tr(lang, "একই আকাশ, একই প্রাঙ্গণ—আবার একসঙ্গে, Reunion 2027-এ।", "One school. Many journeys. One unforgettable homecoming.")}</p>
        <div className="hero-slider-actions">
          <Link className="hero-slider-primary" href="/register">{tr(lang, "নিবন্ধন করুন", "Register for reunion")} <span aria-hidden="true">↗</span></Link>
          <Link className="hero-slider-secondary" href="/alumni">{tr(lang, "প্রাক্তন শিক্ষার্থী", "Explore alumni")}</Link>
        </div>
        {(date || venue) && <div className="hero-slider-eventline">
          {date && <span><i aria-hidden="true">✦</i>{date}</span>}
          {venue && <span><i aria-hidden="true">⌖</i>{venue}</span>}
        </div>}
      </div>
      <div className="hero-arrows">
        <button type="button" aria-label={tr(lang, "আগের ছবি", "Previous slide")} onClick={() => setActive((current) => (current - 1 + slides.length) % slides.length)}>‹</button>
        <button type="button" aria-label={tr(lang, "পরের ছবি", "Next slide")} onClick={() => setActive((current) => (current + 1) % slides.length)}>›</button>
      </div>
      <div className="hero-slide-dots" role="group" aria-label={tr(lang, "ছবি নির্বাচন", "Choose slide")}>
        {slides.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            className={active === index ? "active" : ""}
            aria-label={tr(lang, `ছবি ${index + 1}`, `Slide ${index + 1}`)}
            aria-pressed={active === index}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}
