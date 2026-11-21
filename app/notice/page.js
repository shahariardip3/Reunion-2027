import { db } from "../../lib/supabase";
import { t, tr } from "../../lib/i18n";
import { getLang } from "../../lib/server-lang";
import { todayInDhaka } from "../../lib/settings";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "নোটিশ বোর্ড | Notice Board",
  description: "গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয় পুনর্মিলনী ২০২৭-এর সর্বশেষ নোটিশ ও ঘোষণা। Latest notices and announcements for the Ganganandapur Secondary School Reunion 2027.",
  alternates: { canonical: "/notice" },
};

export default async function NoticePage() {
  const lang = await getLang();
  const { data: rows, error } = await db().from("notices")
    .select("id,title_bn,title_en,body_bn,body_en,pinned,created_at,expires_at")
    .eq("published", true)
    .or(`expires_at.is.null,expires_at.gte.${todayInDhaka()}`)
    .order("pinned", { ascending: false }).order("created_at", { ascending: false });
  const locale = lang === "bn" ? "bn-BD" : "en-GB";
  return (
    <section>
      <h1>{t(lang, "noticeBoard")}</h1>
      {error && <p className="card">{tr(lang, "নোটিশ লোড করা যায়নি।", "Notices could not be loaded.")}</p>}
      {!error && (!rows || rows.length === 0) && <p className="card">{tr(lang, "এখনো কোনো নোটিশ প্রকাশ করা হয়নি।", "No notices have been published yet.")}</p>}
      <div className="notice-list">
        {(rows || []).map((n) => (
          <article className={"card notice-card" + (n.pinned ? " is-pinned" : "")} key={n.id}>
            <div className="notice-meta">
              {n.pinned && <span className="badge pinned">📌 {tr(lang, "গুরুত্বপূর্ণ", "Pinned")}</span>}
              <time dateTime={n.created_at}>{new Date(n.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}</time>
            </div>
            <h2>{lang === "bn" ? n.title_bn : n.title_en}</h2>
            <p className="notice-body">{lang === "bn" ? n.body_bn : n.body_en}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
