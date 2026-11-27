import GalleryPage from "../GalleryPage";
import { getGalleryPhotos } from "../../lib/gallery";
import { getLang } from "../../lib/server-lang";
import { tr } from "../../lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLang();
  return {
    title: tr(lang, "রিইউনিয়ন ফটো গ্যালারি", "Reunion Photo Gallery"),
    description: tr(lang, "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয় পুনর্মিলনী ২০২৭-এর ছবি।", "Photos from Ganganandapur Secondary School Reunion 2027."),
    alternates: { canonical: "/reunion-gallery" },
  };
}

export default async function Page() {
  const [lang, photos] = await Promise.all([getLang(), getGalleryPhotos("reunion")]);
  return <GalleryPage lang={lang} photos={photos} category="reunion" />;
}
