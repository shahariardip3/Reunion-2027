"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LanguageSwitcher({ lang }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(next) {
    if (busy || next === lang) return;
    setBusy(true);
    try {
      const response = await fetch("/api/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ lang: next }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      router.refresh();
    } catch (error) {
      console.error("[language-switch]", error);
      window.alert(next === "bn" ? "ভাষা পরিবর্তন করা যায়নি। ইন্টারনেট/সার্ভার পরীক্ষা করে আবার চেষ্টা করুন।" : "Could not change language. Check the server and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="language-switch" role="group" aria-label={lang === "bn" ? "ভাষা" : "Language"}>
      <button type="button" disabled={busy} onClick={() => change("bn")} aria-pressed={lang === "bn"} lang="bn">বাংলা</button>
      <button type="button" disabled={busy} onClick={() => change("en")} aria-pressed={lang === "en"} lang="en">EN</button>
    </div>
  );
}
