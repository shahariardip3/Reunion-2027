import GalleryPage from "../GalleryPage";
import { getGalleryPhotos } from "../../lib/gallery";
import { getLang } from "../../lib/server-lang";
import { tr } from "../../lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLang();
  return {
    title: tr(lang, "স্মৃতির গ্যালারি", "Memories Gallery"),
    description: tr(lang, "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়ের পুরোনো দিনের স্মৃতির ছবি।", "Memories from Ganganandapur Secondary School."),
    alternates: { canonical: "/memories" },
  };
}

export default async function Page() {
  const [lang, photos] = await Promise.all([getLang(), getGalleryPhotos("memories")]);
  return <GalleryPage lang={lang} photos={photos} category="memories" />;
}
