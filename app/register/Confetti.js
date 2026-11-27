"use client";
import { useEffect } from "react";

/** One short confetti burst when a registration is submitted. Draws on its own canvas outside React's tree. */
export default function Confetti() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "9999" });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const colors = ["#23704a", "#d3a23a", "#e3c27f", "#2b8352", "#f3f7ef"];
    const pieces = Array.from({ length: 140 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 160, y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8,
      r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.35,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    const start = performance.now();
    const LIFE = 3200;
    let raf = 0;
    const tick = (now) => {
      const t = now - start;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of pieces) {
        p.vy += 0.32; p.vx *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - t / LIFE);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t < LIFE) raf = requestAnimationFrame(tick); else canvas.remove();
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); canvas.remove(); };
  }, []);
  return null;
}
