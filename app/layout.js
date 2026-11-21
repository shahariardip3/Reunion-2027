import "./globals.css";
import Link from "next/link";
import { t, tr } from "../lib/i18n";
import { getLang } from "../lib/server-lang";
import { SCHOOL, KEYWORDS, siteUrl } from "../lib/site";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import NavLinks from "./NavLinks";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap";

// Runs before first paint so the saved theme never flashes. Light is the default.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");document.documentElement.dataset.theme=t==="dark"?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}`;

// Development only: shows blocked scripts / JS errors as a red bar so a "dead" page is never silent.
const DEV_WARN = `(function(){function show(m){var b=document.getElementById("__devwarn");if(!b){b=document.createElement("div");b.id="__devwarn";b.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#8f1d1d;color:#fff;padding:10px 14px;font:13px/1.4 monospace;white-space:pre-wrap";(document.body||document.documentElement).appendChild(b)}b.textContent+=m+"\\n"}window.addEventListener("securitypolicyviolation",function(e){show("CSP blocked: "+e.violatedDirective+" -> "+e.blockedURI)});window.addEventListener("error",function(e){show("JS error: "+e.message)});window.addEventListener("unhandledrejection",function(e){var r=e.reason;show("Unhandled promise: "+(r&&r.message?r.message:String(r)))})})();`;

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#15432c",
};

const TITLE = `${SCHOOL.bn} পুনর্মিলনী ২০২৭ | ${SCHOOL.en} Reunion 2027`;
const DESCRIPTION =
  `${SCHOOL.bn} (ঝিকরগাছা, যশোর, প্রতিষ্ঠিত ১৯৪০) পুনর্মিলনী ২০২৭ — অনলাইনে নিবন্ধন, নোটিশ বোর্ড ও প্রাক্তন শিক্ষার্থী ডিরেক্টরি। ` +
  `${SCHOOL.en} (Jhikargacha, Jashore, est. 1940) Reunion 2027: online registration, notices and alumni directory.`;

export function generateMetadata() {
  const base = siteUrl();
  const meta = {
    title: { default: TITLE, template: `%s | ${SCHOOL.bn} পুনর্মিলনী ২০২৭` },
    description: DESCRIPTION,
    keywords: KEYWORDS,
    applicationName: `${SCHOOL.en} Reunion 2027`,
    authors: [{ name: "Al Shahariar Dip" }],
    creator: "Al Shahariar Dip",
    category: "education",
    formatDetection: { telephone: false, email: false, address: false },
    icons: { icon: [{ url: "/favicon.ico" }, { url: "/logo-128.png", sizes: "128x128", type: "image/png" }], apple: "/logo-256.png" },
    openGraph: {
      type: "website", siteName: `${SCHOOL.bn} পুনর্মিলনী ২০২৭`, title: TITLE, description: DESCRIPTION,
      locale: "bn_BD", alternateLocale: ["en_US"],
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: `${SCHOOL.bn} — ${SCHOOL.en}` }],
    },
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.jpg"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
  if (base) meta.metadataBase = new URL(base);
  if (process.env.GOOGLE_SITE_VERIFICATION) meta.verification = { google: process.env.GOOGLE_SITE_VERIFICATION };
  return meta;
}

function organizationLd() {
  const base = siteUrl();
  const abs = (p) => (base ? base + p : undefined);
  return {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": abs("/#school"),
    name: SCHOOL.bn,
    alternateName: [SCHOOL.en, ...SCHOOL.alt],
    foundingDate: SCHOOL.founded,
    identifier: `EIIN ${SCHOOL.eiin}`,
    url: abs("/"),
    logo: abs("/logo.png"),
    image: abs("/school-gate.jpg"),
    address: { "@type": "PostalAddress", streetAddress: "Ganganandapur", addressLocality: "Jhikargacha", addressRegion: "Jashore", addressCountry: "BD" },
  };
}

export default async function RootLayout({ children }) {
  const lang = await getLang();
  const links = [["/", "home"], ["/register", "register"], ["/status", "status"], ["/alumni", "navAlumni"], ["/notice", "notice"]];
  return (
    <html lang={lang} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {process.env.NODE_ENV !== "production" && <script dangerouslySetInnerHTML={{ __html: DEV_WARN }} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_URL} />
      </head>
      <body>
        <a className="skip-link" href="#main">{t(lang, "skip")}</a>
        <header className="top">
          <div className="topin">
            <Link href="/" className="brand">
              <img src="/logo-128.png" alt="" width="44" height="44" />
              <span>{t(lang, "school")}</span>
            </Link>
            <NavLinks lang={lang} />
            <div className="controls">
              <ThemeToggle lang={lang} />
              <LanguageSwitcher lang={lang} />
            </div>
          </div>
        </header>

        <main id="main" className="wrap">{children}</main>

        <footer className="foot">
          <div className="foot-in">
            <div className="foot-school">
              <img src="/logo-128.png" alt="" width="52" height="52" loading="lazy" />
              <div>
                <strong>{t(lang, "school")}</strong>
                <span>{t(lang, "footer")}</span>
                <span>{t(lang, "established")} · {t(lang, "reunion")}</span>
              </div>
            </div>
            <nav className="foot-nav" aria-label={tr(lang, "ফুটার মেনু", "Footer menu")}>
              {links.map(([href, key]) => <Link key={href} href={href}>{t(lang, key)}</Link>)}
            </nav>
            <section className="creator-section" aria-label={tr(lang, "ওয়েবসাইট নির্মাতা", "Website creator")}>
              <div className="creator-kicker">{tr(lang, "ওয়েবসাইট নির্মাতা", "WEBSITE CREATOR")}</div>
              <div className="creator-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="presentation"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="4" /></svg>
              </div>
              <h2 className="creator-name">Al Shahariar Dip</h2>
              <p className="creator-batch">{tr(lang, "এসএসসি ব্যাচ ২০২১", "SSC Batch 2021")}</p>
              <div className="creator-present">
                <span className="creator-cap" aria-hidden="true">✦</span>
                <span><small>{tr(lang, "বর্তমানে অধ্যয়নরত", "PRESENT")}</small><strong>KUET (ECE)</strong></span>
              </div>
              <p className="creator-tagline">{tr(lang, "স্মৃতি, বন্ধন ও পুনর্মিলনের জন্য", "For memories, connections and reunion")}</p>
            </section>
          </div>
        </footer>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd()).replace(/</g, "\\u003c") }} />
      </body>
    </html>
  );
}
