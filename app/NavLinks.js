"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, tr } from "../lib/i18n";

const ITEMS = [
  ["/", "home"], ["/register", "register"], ["/status", "status"],
  ["/alumni", "navAlumni"], ["/history", "history"], ["/memories", "memories"],
  ["/reunion-gallery", "reunionGallery"], ["/notice", "notice"],
];
const getLabel = (lang, key) => key === "history"
  ? tr(lang, "ইতিহাস", "History")
  : key === "memories"
  ? tr(lang, "স্মৃতির গ্যালারি", "Memories")
  : key === "reunionGallery"
    ? tr(lang, "রিইউনিয়ন গ্যালারি", "Reunion Photos")
    : t(lang, key);

export default function NavLinks({ lang }) {
  const pathname = usePathname() || "/";
  // The admin login page is not part of the public site: hide the public menu there.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) return null;
  return (
    <nav className="mainnav" aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}>
      {ITEMS.map(([href, key]) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
        return <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>{getLabel(lang, key)}</Link>;
      })}
    </nav>
  );
}
