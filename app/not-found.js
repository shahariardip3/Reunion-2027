import Link from "next/link";
import { t } from "../lib/i18n";
import { getLang } from "../lib/server-lang";

export const metadata = { title: "404" };

export default async function NotFound() {
  const lang = await getLang();
  return (
    <section className="card state-card">
      <div className="state-icon" aria-hidden="true">404</div>
      <h1>{t(lang, "notFoundTitle")}</h1>
      <p>{t(lang, "notFoundNote")}</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link className="btn" href="/">{t(lang, "goHome")}</Link>
      </div>
    </section>
  );
}
