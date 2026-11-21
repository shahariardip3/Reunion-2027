"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../lib/i18n";
import RegistrationsTab from "./RegistrationsTab";
import CheckinScanner from "./CheckinScanner";
import NoticesTab from "./NoticesTab";
import SettingsTab from "./SettingsTab";
import DiagnosticsTab from "./DiagnosticsTab";

export default function AdminPanel({ settings, regs, lang = "en", notices = [] }) {
  const router = useRouter();
  const [tab, setTab] = useState("registrations");
  const nf = new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US");
  const count = (st) => regs.filter((r) => r.status === st).length;
  const approved = count("approved");
  const attended = regs.filter((r) => !!r.attended_at).length;
  const amount = Number(settings.amount) || 0;

  const tabs = [
    ["registrations", tr(lang, "নিবন্ধন", "Registrations"), count("pending")],
    ["checkin", tr(lang, "QR চেক-ইন", "QR Check-in"), 0],
    ["notices", t(lang, "notice"), 0],
    ["settings", tr(lang, "সেটিংস", "Settings"), 0],
    ["system", tr(lang, "সিস্টেম চেক", "System check"), 0],
  ];
  const stats = [
    [nf.format(regs.length), t(lang, "total")],
    [nf.format(count("pending")), t(lang, "pending")],
    [nf.format(approved), t(lang, "approved")],
    [nf.format(attended), tr(lang, "উপস্থিত", "Attended")],
    [`৳ ${nf.format(approved * amount)}`, tr(lang, "অনুমোদিত ফি (আনুমানিক)", "Approved fees (est.)")],
  ];

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/admin/login"); router.refresh();
  }

  return <>
    <div className="admin-heading">
      <h1>{t(lang, "adminPanel")}</h1>
      <button type="button" className="btn ghost" onClick={logout}>{t(lang, "logout")}</button>
    </div>

    <div className="stats">
      {stats.map(([value, label]) => <div className="card" key={label}><b>{value}</b>{label}</div>)}
    </div>

    <div className="admin-tabs" role="tablist" aria-label={t(lang, "adminPanel")}>
      {tabs.map(([key, label, badge]) => (
        <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`}
          className={"admin-tab" + (tab === key ? " active" : "")} onClick={() => setTab(key)}>
          {label}{badge > 0 && <span className="tab-badge">{nf.format(badge)}</span>}
        </button>
      ))}
    </div>

    <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === "registrations" && <RegistrationsTab regs={regs} lang={lang} />}
      {tab === "checkin" && <CheckinScanner lang={lang} />}
      {tab === "notices" && <NoticesTab notices={notices} lang={lang} />}
      {tab === "settings" && <SettingsTab settings={settings} lang={lang} />}
      {tab === "system" && <DiagnosticsTab lang={lang} />}
    </div>
  </>;
}
