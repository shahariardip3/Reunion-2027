import Link from "next/link";
import Reveal from "../Reveal";
import HistoryTimeline from "../HistoryTimeline";
import { getHistoryEvents, buildTimeline } from "../../lib/history";
import { getSettings, localized } from "../../lib/settings";
import { getLang } from "../../lib/server-lang";
import { tr } from "../../lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLang();
  return {
    title: tr(lang, "বিদ্যালয়ের ইতিহাস", "School history"),
    description: tr(lang, "১৯৪০ থেকে ২০২৭ — গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়ের পথচলা।", "1940 to 2027 — the journey of Ganganandapur Secondary School."),
    alternates: { canonical: "/history" },
  };
}

export default async function HistoryPage() {
  const lang = await getLang();
  const [events, s] = await Promise.all([getHistoryEvents(), getSettings().catch(() => ({}))]);
  const items = buildTimeline({ lang, events, reunionDate: s?.reunion_date, venue: localized(s || {}, "venue", lang) });
  return (
    <Reveal className="section-reveal">
      <section className="section history-section">
        <div className="gallery-page-topline"><Link href="/">← {tr(lang, "হোমে ফিরুন", "Back to Home")}</Link></div>
        <div className="history-head">
          <span className="memory-kicker">{tr(lang, "আমাদের পথচলা", "OUR JOURNEY")}</span>
          <h1>{tr(lang, "১৯৪০ থেকে ২০২৭", "From 1940 to 2027")}</h1>
          <p>{tr(lang, "একটি বিদ্যালয়ের গল্প—যেখানে প্রজন্মের পর প্রজন্ম শিখেছে, বড় হয়েছে, আর আজ আবার ফিরে আসছে।", "The story of a school where generation after generation learned and grew up, and where we now return together.")}</p>
        </div>
        <HistoryTimeline lang={lang} items={items} />
      </section>
    </Reveal>
  );
}
