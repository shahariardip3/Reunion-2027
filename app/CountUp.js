"use client";
import { useEffect, useRef, useState } from "react";

// Counts up once, when the number scrolls into view. The server renders the final value,
// so crawlers, no-JS visitors and reduced-motion users always see the real number.
export default function CountUp({ value = 0, lang = "en", duration = 1100 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    setShown(value);
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  const text = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US").format(shown);
  return <span ref={ref} className="countup">{text}</span>;
}
