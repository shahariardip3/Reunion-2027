"use client";
import { useEffect, useRef } from "react";
import { tr } from "../lib/i18n";

const FROM = 1940, TO = 2027;

/**
 * Vertical, alternating timeline with a scroll-drawn spine, plus a horizontal "era ruler" on top.
 * Items are plain, already-localised data from the server, so everything is readable without JavaScript.
 */
export default function HistoryTimeline({ lang = "bn", items = [] }) {
  const root = useRef(null);
  const nf = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { useGrouping: false });
  const span = TO - FROM;
  const years = TO - FROM;

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.classList.add("tl-ready");
    const all = [...node.querySelectorAll("[data-tl-item]")];
    if (reduce || !("IntersectionObserver" in window)) { all.forEach((el) => el.classList.add("is-in")); node.style.setProperty("--tl-progress", "1"); return; }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    all.forEach((el) => io.observe(el));

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh * 0.6 - r.top) / Math.max(1, r.height)));
      node.style.setProperty("--tl-progress", p.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [items.length]);

  return (
    <div className="tl" ref={root}>
      <div className="tl-ruler" role="img" aria-label={tr(lang, `${nf.format(FROM)} থেকে ${nf.format(TO)} — ${nf.format(years)} বছরের পথচলা`, `${FROM} to ${TO} — ${years} years of the journey`)}>
        <span className="tl-ruler-end">{nf.format(FROM)}</span>
        <div className="tl-ruler-track">
          {items.map((it) => (
            <a key={it.id} className={`tl-ruler-dot ${it.kind}`} href={`#tl-${it.id}`} style={{ left: `${((it.year - FROM) / span) * 100}%` }} title={`${nf.format(it.year)} — ${it.title}`} aria-label={`${nf.format(it.year)} — ${it.title}`} />
          ))}
        </div>
        <span className="tl-ruler-end">{nf.format(TO)}</span>
        <p className="tl-ruler-note">{tr(lang, `${nf.format(years)} বছরের পথচলা`, `${years} years of the journey`)}</p>
      </div>

      <ol className="tl-list">
        {items.map((it, i) => (
          <li key={it.id} id={`tl-${it.id}`} data-tl-item className={`tl-item ${it.kind} ${i % 2 ? "right" : "left"}`}>
            <span className="tl-node" aria-hidden="true" />
            <div className="tl-card">
              <time className="tl-year" dateTime={String(it.year)}>{nf.format(it.year)}</time>
              <h3>{it.title}</h3>
              {it.body && <p>{it.body}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
