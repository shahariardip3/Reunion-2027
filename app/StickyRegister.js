"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tr } from "../lib/i18n";

// Phone-only register button that appears after the first screen and steps aside near the footer.
export default function StickyRegister({ lang = "bn" }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY || 0;
      const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 360;
      setShown(y > 520 && !nearEnd);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);
  return (
    <div className={`sticky-register${shown ? " is-shown" : ""}`} aria-hidden={!shown}>
      <Link href="/register" tabIndex={shown ? 0 : -1}>{tr(lang, "নিবন্ধন করুন", "Register now")}</Link>
    </div>
  );
}
