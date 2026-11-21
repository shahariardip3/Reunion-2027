"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "../lib/i18n";

const ITEMS = [
  ["/", "home"],
  ["/register", "register"],
  ["/status", "status"],
  ["/alumni", "navAlumni"],
  ["/notice", "notice"],
];

export default function NavLinks({ lang }) {
  const pathname = usePathname() || "/";
  return (
    <nav className="mainnav" aria-label={lang === "bn" ? "প্রধান মেনু" : "Main navigation"}>
      {ITEMS.map(([href, key]) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            {t(lang, key)}
          </Link>
        );
      })}
    </nav>
  );
}
