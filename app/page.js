import Link from "next/link";
import { db } from "../lib/supabase";
import Countdown from "./Countdown";
import ShareButtons from "./ShareButtons";
import { t, tr } from "../lib/i18n";
import { getLang } from "../lib/server-lang";
import { SCHOOL, siteUrl } from "../lib/site";
import { getSettings, isRegistrationOpen, localized, paymentMethods, todayInDhaka } from "../lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { alternates: { canonical: "/" } };

const isFacebookUrl = (v) => {
  try { const u = new URL(v); return u.protocol === "https:" && (u.hostname === "facebook.com" || u.hostname.endsWith(".facebook.com") || u.hostname === "fb.me"); }
  catch { return false; }
};
const excerpt = (text = "", n = 150) => (text.length > n ? text.slice(0, n).trimEnd() + "…" : text);
const safe = async (promise, fallback) => { try { return await promise; } catch { return fallback; } };
const METHOD_NAMES = { bkash: "bKash", nagad: "Nagad", bank: { bn: "ব্যাংক ট্রান্সফার", en: "bank transfer" } };

function eventLd({ s, title, venue, base }) {
  if (!s.reunion_date) return null;
  const abs = (p) => (base ? base + p : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${SCHOOL.bn} ${title}`,
    alternateName: `${SCHOOL.en} Reunion 2027`,
    startDate: s.reunion_date,
    endDate: s.reunion_date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendance",
    location: { "@type": "Place", name: venue || SCHOOL.bn, address: { "@type": "PostalAddress", addressLocality: "Jhikargacha", addressRegion: "Jashore", addressCountry: "BD" } },
    organizer: { "@type": "EducationalOrganization", name: SCHOOL.bn, url: abs("/") },
    image: [abs("/og-image.jpg")].filter(Boolean),
    description: `${SCHOOL.en} Reunion 2027 — alumni gathering of ${SCHOOL.bn}, Jhikargacha, Jashore.`,
    url: abs("/"),
  };
}

export default async function Home() {
  const lang = await getLang();
  const sb = db();
  const [s, notices, confirmed] = await Promise.all([
    getSettings(),
    safe((async () => {
      const { data, error } = await sb.from("notices")
        .select("id,title_bn,title_en,body_bn,body_en,pinned,created_at")
        .eq("published", true).or(`expires_at.is.null,expires_at.gte.${todayInDhaka()}`)
        .order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3);
      return error ? [] : data || [];
    })(), []),
    safe((async () => {
      const { count, error } = await sb.from("registrations").select("id", { count: "exact", head: true }).eq("status", "approved");
      return error ? 0 : count || 0;
    })(), 0),
  ]);

  const open = isRegistrationOpen(s);
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  const nf = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US");
  const date = s.reunion_date
    ? new Date(`${s.reunion_date}T00:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : null;
  const venue = localized(s, "venue", lang);
  const title = localized(s, "event_title", lang) || t(lang, "reunion");
  const note = localized(s, "event_note", lang);
  const methods = paymentMethods(s);
  const methodText = methods.map((m) => (typeof METHOD_NAMES[m.id] === "string" ? METHOD_NAMES[m.id] : METHOD_NAMES[m.id][lang])).join(", ");
  const ld = eventLd({ s, title, venue, base: siteUrl() });

  const faqs = [
    [tr(lang, "কারা অংশ নিতে পারবেন?", "Who can attend?"),
     tr(lang, "বিদ্যালয়ের প্রাক্তন শিক্ষার্থীরা নিবন্ধন করে অংশ নিতে পারবেন। অন্য কারও অংশগ্রহণের বিষয়ে নোটিশ বোর্ডের ঘোষণা দেখুন।", "Alumni of the school can attend after registering. For anyone else, please follow the announcements on the notice board.")],
    [tr(lang, "নিবন্ধন ফি কত এবং কীভাবে দেব?", "What is the fee and how do I pay?"),
     s.amount
       ? tr(lang, `ফি ${nf.format(s.amount)} টাকা।${methodText ? ` ${methodText}-এ পাঠিয়ে` : ""} নিবন্ধন ফর্মের দ্বিতীয় ধাপে TrxID লিখুন।`, `The fee is ${nf.format(s.amount)} BDT.${methodText ? ` Pay via ${methodText} and` : ""} enter the TrxID in step 2 of the registration form.`)
       : tr(lang, "ফি ও পেমেন্টের তথ্য নিবন্ধন ফর্মের দ্বিতীয় ধাপে দেখানো হবে।", "Fee and payment details are shown in step 2 of the registration form.")],
    [tr(lang, "অনুমোদন কখন হবে?", "When will my registration be approved?"),
     tr(lang, "অ্যাডমিন পেমেন্ট যাচাই করার পর অনুমোদন দেন। TrxID ও ফোন নম্বর দিয়ে “নিবন্ধনের অবস্থা” পেজে দেখে নিন।", "The admin approves after verifying your payment. Check the “Status” page with your TrxID and phone number.")],
    [tr(lang, "অনুষ্ঠানের দিন কী সঙ্গে আনব?", "What should I bring on the event day?"),
     tr(lang, "অনুমোদনের পর স্ট্যাটাস পেজ থেকে QR কনফার্মেশন কার্ড সংরক্ষণ করুন এবং ফোনে বা প্রিন্ট করে সঙ্গে আনুন।", "After approval, save your QR confirmation card from the Status page and bring it on your phone or printed.")],
  ];

  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />}

      <section className="hero">
        <div className="hero-banner">
          <img className="hero-img" src="/school-gate.jpg" srcSet="/school-gate-640.jpg 640w, /school-gate.jpg 875w" sizes="(max-width: 1120px) 100vw, 1120px"
            alt={tr(lang, "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়ের প্রবেশদ্বার", "Main gate of Ganganandapur Secondary School")} width="875" height="768" fetchPriority="high" decoding="async" />
        </div>
        <div className="hero-body">
          <img className="biglogo" src="/logo-256.png" alt={`${t(lang, "school")} logo`} width="132" height="132" />
          <span className="eyebrow">{t(lang, "established")} · {t(lang, "location")}</span>
          <h1>
            <span className="h1-school">{t(lang, "school")}</span>
            <span className="h1-title">{title}</span>
          </h1>
          {note && <p className="lead">{note}</p>}
          {s.reunion_date && <Countdown date={s.reunion_date} lang={lang} />}
          <div className="row action-row">
            {open
              ? <Link className="btn" href="/register">{t(lang, "registerNow")}</Link>
              : <span className="badge closed">{t(lang, "registrationClosed")}</span>}
            <Link className="btn ghost" href="/status">{t(lang, "checkStatus")}</Link>
            <Link className="btn ghost" href="/alumni">{t(lang, "seeAlumni")}</Link>
          </div>
          <ShareButtons lang={lang} date={s.reunion_date || ""} title={`${t(lang, "school")} — ${title}`} venue={venue} />
        </div>
      </section>

      {(date || venue || confirmed > 0) && (
        <section className="info-grid" aria-label={tr(lang, "অনুষ্ঠানের তথ্য", "Event information")}>
          {date && <div className="info-tile"><span>📅 {t(lang, "date")}</span><b>{date}</b></div>}
          {venue && <div className="info-tile"><span>📍 {t(lang, "venue")}</span><b>{venue}</b></div>}
          {confirmed > 0 && <div className="info-tile"><span>✅ {tr(lang, "অংশগ্রহণকারী", "Attendees")}</span><b>{nf.format(confirmed)} {t(lang, "confirmedCount")}</b></div>}
        </section>
      )}

      <section className="section about" aria-labelledby="about-title">
        <div className="card">
          <h2 id="about-title">{tr(lang, "বিদ্যালয় সম্পর্কে", "About the school")}</h2>
          <p>{tr(lang,
            "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয় ১৯৪০ সালে প্রতিষ্ঠিত। বিদ্যালয়টি যশোর জেলার ঝিকরগাছা উপজেলার গঙ্গানন্দপুরে অবস্থিত (EIIN: ১১৫৭২৯)। আট দশকের বেশি সময় ধরে এই প্রতিষ্ঠান থেকে পড়াশোনা শেষ করা শিক্ষার্থীরা আজ নানা পেশায়, নানা জায়গায় ছড়িয়ে আছেন।",
            "Ganganandapur Secondary School was established in 1940 and is located at Ganganandapur, Jhikargacha upazila, Jashore (EIIN: 115729). For more than eight decades its students have gone on to many professions and places.")}</p>
          <p>{tr(lang,
            "পুনর্মিলনী ২০২৭ হলো প্রাক্তন শিক্ষার্থী, শিক্ষক ও শুভানুধ্যায়ীদের একসঙ্গে হওয়ার, পুরোনো বন্ধুত্ব ঝালিয়ে নেওয়ার এবং নতুন প্রজন্মের সঙ্গে সংযোগ গড়ার আয়োজন।",
            "Reunion 2027 is a chance for alumni, teachers and well-wishers to meet, renew old friendships and connect with the next generation.")}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="section-head"><h2 id="how-title">{t(lang, "howTitle")}</h2><p>{t(lang, "howSub")}</p></div>
        <ol className="steps">
          {[1, 2, 3, 4].map((n) => (
            <li className="step" key={n}>
              <span className="step-no" aria-hidden="true">{nf.format(n)}</span>
              <div><b>{t(lang, `step${n}T`)}</b><p>{t(lang, `step${n}D`)}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {notices.length > 0 && (
        <section className="section" aria-labelledby="notice-title">
          <div className="section-head"><h2 id="notice-title">{t(lang, "latestNotices")}</h2></div>
          <div className="notice-list">
            {notices.map((n) => (
              <article className="card notice-card" key={n.id}>
                {n.pinned && <span className="badge pinned">📌 {tr(lang, "গুরুত্বপূর্ণ", "Pinned")}</span>}
                <h3>{lang === "bn" ? n.title_bn : n.title_en}</h3>
                <p>{excerpt(lang === "bn" ? n.body_bn : n.body_en)}</p>
              </article>
            ))}
          </div>
          <div className="row" style={{ justifyContent: "center" }}><Link className="btn ghost" href="/notice">{t(lang, "allNotices")}</Link></div>
        </section>
      )}

      <section className="section" aria-labelledby="faq-title">
        <div className="section-head"><h2 id="faq-title">{tr(lang, "সচরাচর জিজ্ঞাসা", "Frequently asked questions")}</h2></div>
        <div className="faq">
          {faqs.map(([q, a]) => (
            <details key={q}><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      {isFacebookUrl(s.facebook_page_url) && (
        <div className="facebook-page-wrap">
          <a className="facebook-page-link" href={s.facebook_page_url} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true">f</span> {tr(lang, "আমাদের Facebook Page", "Our Facebook Page")}
          </a>
        </div>
      )}
    </>
  );
}
