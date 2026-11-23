import Link from "next/link";
import RegisterForm from "./RegisterForm";
import { t } from "../../lib/i18n";
import { getLang } from "../../lib/server-lang";
import { getSettings, isRegistrationOpen, localized, paymentMethods } from "../../lib/settings";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "নিবন্ধন | Registration",
  description: "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয় পুনর্মিলনী ২০২৭-এ অনলাইনে নিবন্ধন করুন। Register online for the Ganganandapur Secondary School Reunion 2027.",
  alternates: { canonical: "/register" },
};

export default async function Page() {
  const lang = await getLang();
  const s = await getSettings();
  if (!isRegistrationOpen(s)) {
    return (
      <section className="card state-card">
        <div className="state-icon" aria-hidden="true">🔒</div>
        <h1>{t(lang, "registrationClosed")}</h1>
        <p>{t(lang, "registrationClosedNote")}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/notice">{t(lang, "noticeBoard")}</Link>
          <Link className="btn ghost" href="/">{t(lang, "goHome")}</Link>
        </div>
      </section>
    );
  }
  // Only what the form needs is sent to the browser.
  const pay = { amount: s.amount ?? 0, methods: paymentMethods(s), note: localized(s, "payment_note", lang) };
  return <><h1>{t(lang, "registration")}</h1><RegisterForm pay={pay} lang={lang} emailEnabled={s.email_field_enabled !== false} emailRequired={s.email_field_required !== false} tshirtEnabled={s.tshirt_field_enabled === true} tshirtRequired={s.tshirt_field_required === true} tshirtSizes={Array.isArray(s.tshirt_sizes) && s.tshirt_sizes.length ? s.tshirt_sizes : ["S","M","L","XL","XXL","XXXL"]} /></>;
}
