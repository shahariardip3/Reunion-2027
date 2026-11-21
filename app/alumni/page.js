import { db } from "../../lib/supabase";
import { t } from "../../lib/i18n";
import { getLang } from "../../lib/server-lang";
import { signedUrlMap } from "../../lib/photos";
import AlumniDirectory from "./AlumniDirectory";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "প্রাক্তন শিক্ষার্থী | Alumni Directory",
  description: "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়ের প্রাক্তন শিক্ষার্থীদের ব্যাচ অনুযায়ী তালিকা। Alumni directory of Ganganandapur Secondary School by SSC batch.",
  alternates: { canonical: "/alumni" },
};

export default async function Alumni() {
  const lang = await getLang();
  const sb = db();
  const { data: settings } = await sb.from("settings").select("show_public").eq("id", 1).maybeSingle();
  if (!settings?.show_public) return <><h1>{t(lang, "alumni")}</h1><p className="card">{t(lang, "notPublic")}</p></>;

  const { data, error } = await sb.from("registrations")
    .select("id,full_name,ssc_batch,profession,phone,phone_public,photo_path")
    .eq("status", "approved").order("ssc_batch").order("full_name");
  if (error) return <><h1>{t(lang, "alumni")}</h1><p className="error-panel">{lang === "bn" ? "ডিরেক্টরি সাময়িকভাবে পাওয়া যাচ্ছে না।" : "Alumni directory is temporarily unavailable."}</p></>;

  const urls = await signedUrlMap(sb, (data || []).map((r) => r.photo_path), 900);
  // Privacy: private phone numbers and storage paths must never reach the browser.
  const alumni = (data || []).map((r) => ({
    id: r.id, full_name: r.full_name, ssc_batch: r.ssc_batch, profession: r.profession || "",
    phone: r.phone_public ? r.phone || "" : "", photo_url: urls[r.photo_path] || "",
  }));
  return <AlumniDirectory alumni={alumni} lang={lang} />;
}
