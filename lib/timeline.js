export const FOUNDED_YEAR = 1940;
export const REUNION_YEAR = 2027;

/** Build the final, already-localised list the timeline component renders. */
export function buildTimeline({ lang, events, reunionDate, venue }) {
  const bn = lang === "bn";
  const start = {
    id: "founding", kind: "start", year: FOUNDED_YEAR,
    title: bn ? "বিদ্যালয়ের প্রতিষ্ঠা" : "The school is founded",
    body: bn
      ? "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয় যশোর জেলার ঝিকরগাছা উপজেলার গঙ্গানন্দপুরে যাত্রা শুরু করে।"
      : "Ganganandapur Secondary School begins its journey at Ganganandapur, Jhikargacha upazila, Jashore.",
  };
  const middle = events.map((e) => ({
    id: e.id, kind: "event", year: e.year,
    title: bn ? e.title_bn : e.title_en,
    body: (bn ? e.body_bn : e.body_en) || "",
  }));
  if (!middle.length) {
    middle.push({
      id: "profile-2024", kind: "event", year: 2024,
      title: bn ? "আজকের বিদ্যালয়" : "The school today",
      body: bn
        ? "২০২৪ সালের প্রোফাইল অনুযায়ী ৯১১ জন শিক্ষার্থী, ২৫ জন শিক্ষক ও ৭ জন কর্মী নিয়ে মাধ্যমিক স্তরের (৬ষ্ঠ–১০ম শ্রেণি) পাঠদান চলছে।"
        : "Per the 2024 school profile: 911 students, 25 teachers and 7 staff teaching grades 6–10.",
    });
  }
  const end = {
    id: "reunion-2027", kind: "end", year: REUNION_YEAR,
    title: bn ? "পুনর্মিলনী ২০২৭" : "Reunion 2027",
    body: [
      reunionDate ? new Date(`${reunionDate}T00:00:00Z`).toLocaleDateString(bn ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "",
      venue || "",
    ].filter(Boolean).join(" · ") || (bn ? "সব প্রাক্তন শিক্ষার্থী আবার একসঙ্গে।" : "All alumni together again."),
  };
  return [start, ...middle.filter((m) => m.year > FOUNDED_YEAR - 1 && m.year < REUNION_YEAR + 1), end];
}
