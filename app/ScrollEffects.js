"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Scroll reveal built on the Web Animations API.
// IMPORTANT: this never changes an element's class, style or data attributes. React compares the
// server HTML with the client tree while hydrating, so touching those attributes early causes
// "hydration mismatch" errors. Animations created with el.animate() are invisible to that check.
//
// Pages opt in with attributes that are rendered by the server (so they always match):
//   data-reveal="up|left|right|zoom|fade"   reveal one element when it scrolls into view
//   data-reveal-stagger                     reveal the children one after another
// Without JS, or with reduced motion, nothing is hidden at all.
const FRAMES = {
  up:    [{ opacity: 0, transform: "translateY(28px)" }, { opacity: 1, transform: "none" }],
  left:  [{ opacity: 0, transform: "translateX(-36px)" }, { opacity: 1, transform: "none" }],
  right: [{ opacity: 0, transform: "translateX(36px)" }, { opacity: 1, transform: "none" }],
  zoom:  [{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "none" }],
  fade:  [{ opacity: 0 }, { opacity: 1 }],
};
const AUTO = ".directory-hero, .directory-filters, .batch-section, .memory-section, main.wrap > h1, main.wrap > .card, main.wrap > .form-card";

export default function ScrollEffects() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window) || typeof Element.prototype.animate !== "function") return;

    const seen = new WeakSet();
    const pending = new Map(); // element -> paused animation waiting for its turn
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        pending.get(entry.target)?.play();
        pending.delete(entry.target);
        io.unobserve(entry.target);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    const prepare = (el, kind, index = 0) => {
      if (seen.has(el)) return;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top < window.innerHeight * 0.9) return; // already on screen: leave untouched
      const frames = FRAMES[el.getAttribute("data-reveal")] || FRAMES[kind];
      // fill:"backwards" holds the first frame while paused, and releases the element afterwards,
      // so the element's own hover transforms keep working once it has appeared.
      const animation = el.animate(frames, { duration: 750, delay: index * 80, easing: "cubic-bezier(.2,.7,.2,1)", fill: "backwards" });
      animation.pause();
      pending.set(el, animation);
      io.observe(el);
    };

    const scan = () => {
      document.querySelectorAll("[data-reveal-stagger]").forEach((parent) => {
        Array.from(parent.children).forEach((child, i) => prepare(child, "up", Math.min(i, 8)));
      });
      document.querySelectorAll("[data-reveal]").forEach((el) => prepare(el, "up"));
      document.querySelectorAll(AUTO).forEach((el) => { if (!el.closest(".scroll-reveal, [data-reveal]")) prepare(el, "up"); });
    };

    // Wait one frame after mount so the first paint is not delayed.
    let raf = requestAnimationFrame(scan);
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(scan); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect(); mo.disconnect();
      pending.forEach((animation) => animation.cancel()); // un-hide anything still waiting
      pending.clear();
    };
  }, [pathname]);
  return null;
}
