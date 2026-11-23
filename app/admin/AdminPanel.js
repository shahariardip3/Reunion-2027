
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../lib/i18n";
import RegistrationsTab from "./RegistrationsTab";
import CheckinScanner from "./CheckinScanner";
import NoticesTab from "./NoticesTab";
import SettingsTab from "./SettingsTab";
import DiagnosticsTab from "./DiagnosticsTab";
import EmailHistoryTab from "./EmailHistoryTab";
import SubAdminsTab from "./SubAdminsTab";
import RecycleBinTab from "./RecycleBinTab";
import ActivityLogTab from "./ActivityLogTab";

export default function AdminPanel({
  settings,
  regs = [],
  lang = "en",
  notices = [],
  role = "main",
  adminName = "Admin",
}) {
  const router = useRouter();
  const [tab, setTab] = useState("registrations");

  const nf = new Intl.NumberFormat(
    lang === "bn" ? "bn-BD" : "en-US"
  );

  // Registration counts
  const count = (status) =>
    regs.filter((r) => r.status === status).length;

  const approved = count("approved");
  const pending = count("pending");

  // Event management counts
  const attended = regs.filter(
    (r) => !!r.attended_at
  ).length;

  const giftReceived = regs.filter(
    (r) => !!r.gift_received_at
  ).length;

  const foodReceived = regs.filter(
    (r) => !!r.food_received_at
  ).length;

  const amount = Number(settings.amount) || 0;

  // Sub Admins only receive registration approval and QR scanning tools.
  const tabs = [
    ["registrations", tr(lang, "নিবন্ধন", "Registrations"), pending],
    ["checkin", tr(lang, "QR চেক-ইন", "QR Check-in"), 0],
    ...(role === "main" ? [
      ["notices", t(lang, "notice"), 0],
      ["settings", tr(lang, "সেটিংস", "Settings"), 0],
      ["email", tr(lang, "ইমেইল ইতিহাস", "Email History"), 0],
      ["subadmins", tr(lang, "Sub Admins", "Sub Admins"), 0],
      ["recycle", tr(lang, "Recycle Bin", "Recycle Bin"), 0],
      ["activity", tr(lang, "Activity Log", "Activity Log"), 0],
      ["system", tr(lang, "সিস্টেম চেক", "System check"), 0],
    ] : []),
  ];

    // Dashboard statistics
  const stats = [
    [
      nf.format(regs.length),
      tr(lang, "মোট নিবন্ধন", "Total Registrations"),
    ],
    [
      nf.format(pending),
      t(lang, "pending"),
    ],
    [
      nf.format(approved),
      t(lang, "approved"),
    ],
    [
      nf.format(attended),
      tr(lang, "উপস্থিতি", "Attendance"),
    ],
    [
      nf.format(giftReceived),
      tr(lang, "Gift পেয়েছে", "Gift Received"),
    ],
    [
      nf.format(foodReceived),
      tr(lang, "Food নিয়েছে", "Food Received"),
    ],
    [
      `৳ ${nf.format(approved * amount)}`,
      tr(
        lang,
        "অনুমোদিত ফি (আনুমানিক)",
        "Approved Fees (Est.)"
      ),
    ],
  ];

  // Logout
  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    }).catch(() => {});

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Admin Header */}
      <div className="admin-heading">
        <div><h1>{t(lang, "adminPanel")}</h1><small className="muted">{adminName} · {role === "main" ? "Main Admin" : "Sub Admin"}</small></div>

        <button
          type="button"
          className="btn ghost"
          onClick={logout}
        >
          {t(lang, "logout")}
        </button>
      </div>

      {/* Dashboard Statistics */}
      <div className="stats">
        {stats.map(([value, label]) => (
          <div className="card" key={label}>
            <b>{value}</b>
            {label}
          </div>
        ))}
      </div>

      {/* Admin Navigation */}
      <div
        className="admin-tabs"
        role="tablist"
        aria-label={t(lang, "adminPanel")}
      >
        {tabs.map(([key, label, badge]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            className={
              "admin-tab" +
              (tab === key ? " active" : "")
            }
            onClick={() => setTab(key)}
          >
            {label}

            {badge > 0 && (
              <span className="tab-badge">
                {nf.format(badge)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Admin Tab Content */}
      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === "registrations" && (
          <RegistrationsTab
            regs={regs}
            lang={lang}
            role={role}
          />
        )}

        {tab === "checkin" && (
          <CheckinScanner lang={lang} />
        )}

        {role === "main" && tab === "notices" && (
          <NoticesTab
            notices={notices}
            lang={lang}
          />
        )}

        {role === "main" && tab === "settings" && (
          <SettingsTab
            settings={settings}
            lang={lang}
          />
        )}

        {role === "main" && tab === "email" && <EmailHistoryTab lang={lang} />}
        {role === "main" && tab === "subadmins" && <SubAdminsTab lang={lang} />}
        {role === "main" && tab === "recycle" && <RecycleBinTab lang={lang} />}
        {role === "main" && tab === "activity" && <ActivityLogTab lang={lang} />}
        {role === "main" && tab === "system" && <DiagnosticsTab lang={lang} />}
      </div>
    </>
  );
}
