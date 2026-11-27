// Central place for public site facts (used by metadata, sitemap, structured data).
export const SCHOOL = {
  bn: "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়",
  en: "Ganganandapur Secondary School",
  alt: ["Ganganandapur High School", "Ganganandapur Madhyamik Bidyalay"],
  founded: "1940",
  eiin: "115729",
  locality: { bn: "গঙ্গানন্দপুর, ঝিকরগাছা, যশোর", en: "Ganganandapur, Jhikargacha, Jashore" },
};

/** Public website address without trailing slash. Empty string when it is not configured. */
export function siteUrl() {
  const explicit = process.env.SITE_URL || "";
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
  return (explicit || vercel).replace(/\/+$/, "");
}

/**
 * The address the visitor/admin is actually using right now (works behind Vercel's proxy).
 * Used for links inside e-mails so they always open the live site, even if SITE_URL is missing or outdated.
 */
export function requestOrigin(headers) {
  try {
    const first = (name) => (headers.get(name) || "").split(",")[0].trim();
    const host = first("x-forwarded-host") || first("host");
    if (!host) return "";
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host);
    const proto = first("x-forwarded-proto") || (local ? "http" : "https");
    return `${proto}://${host}`;
  } catch { return ""; }
}

export const KEYWORDS = [
  "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়", "গঙ্গানন্দপুর হাই স্কুল", "গঙ্গানন্দপুর স্কুল পুনর্মিলনী", "ঝিকরগাছা স্কুল পুনর্মিলনী",
  "যশোর স্কুল রিইউনিয়ন", "পুনর্মিলনী ২০২৭", "প্রাক্তন শিক্ষার্থী",
  "Ganganandapur Secondary School", "Ganganandapur High School", "Ganganandapur School Reunion",
  "Jhikargacha school reunion", "Jashore school reunion 2027", "Reunion 2027", "SSC alumni Bangladesh",
];
