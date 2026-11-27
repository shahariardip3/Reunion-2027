import Link from "next/link";
import Reveal from "./Reveal";
import SchoolMemoryGallery from "./SchoolMemoryGallery";
import { tr } from "../lib/i18n";

export default function GalleryPage({ lang = "bn", photos = [], category = "memories" }) {
  const memories = category === "memories";
  const title = memories ? tr(lang, "স্মৃতির গ্যালারি", "Memories Gallery") : tr(lang, "রিইউনিয়ন ফটো গ্যালারি", "Reunion Photo Gallery");
  const description = memories
    ? tr(lang, "বিদ্যালয়ের দিন, বন্ধুদের সঙ্গে কাটানো সময় এবং পুরোনো স্মৃতির ছবির সংগ্রহ।", "A collection of school days, friendships and moments from years gone by.")
    : tr(lang, "Reunion 2027-এর অনুষ্ঠান ও প্রাক্তন শিক্ষার্থীদের মিলনমেলার ছবি।", "Photos from the Reunion 2027 event and the alumni gathering.");
  return (
    <Reveal className="section-reveal">
      <section className="section memory-section full-gallery-page">
        <div className="gallery-page-topline"><Link href="/">← {tr(lang, "হোমে ফিরুন", "Back to Home")}</Link><span>{memories ? tr(lang, "০১ / ০২", "01 / 02") : tr(lang, "০২ / ০২", "02 / 02")}</span></div>
        <div className="memory-section-heading gallery-page-heading">
          <div><span className="memory-kicker">{memories ? tr(lang, "আমাদের স্মৃতি", "OUR SHARED MEMORIES") : tr(lang, "মিলনমেলার মুহূর্ত", "REUNION MOMENTS")}</span><h1>{title}</h1><p>{description}</p></div>
          <div className="memory-count"><strong>{new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { minimumIntegerDigits: 2, useGrouping: false }).format(photos.length)}</strong><span>{tr(lang, "মোট ছবি", "PHOTOS")}</span></div>
        </div>
        <SchoolMemoryGallery lang={lang} photos={photos} category={category} />
      </section>
    </Reveal>
  );
}
