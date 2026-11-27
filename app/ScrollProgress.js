"use client";
import { useEffect, useRef } from "react";

/** Thin reading-progress bar at the top of the page + a back-to-top button after the first screens. */
export default function ScrollProgress({ lang = "bn" }) {
  const bar = useRef(null);
  const btn = useRef(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const root = document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      const p = max > 0 ? Math.min(1, root.scrollTop / max) : 0;
      bar.current?.style.setProperty("--p", p.toFixed(4));
      btn.current?.classList.toggle("is-shown", root.scrollTop > 700);
      document.querySelector(".top")?.classList.toggle("is-scrolled", root.scrollTop > 40);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);
  const label = lang === "bn" ? "উপরে যান" : "Back to top";
  return (
    <>
      <div className="scroll-progress" ref={bar} aria-hidden="true" />
      <button ref={btn} type="button" className="to-top" aria-label={label} title={label} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
    </>
  );
}
