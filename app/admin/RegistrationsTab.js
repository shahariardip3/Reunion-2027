
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../lib/i18n";
import { send, failText } from "./api";

export default function RegistrationsTab({ regs, lang = "en", role = "main" }) {
  const router = useRouter();

  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState(null);

  const locale = lang === "bn" ? "bn-BD" : "en-GB";

  const counts = useMemo(() => ({
    pending: regs.filter((r) => r.status === "pending").length,
    approved: regs.filter((r) => r.status === "approved").length,
    rejected: regs.filter((r) => r.status === "rejected").length,
    attended: regs.filter((r) => r.attended_at).length,
    all: regs.length,
  }), [regs]);

  const term = q.trim().toLowerCase();

  const list = useMemo(() => regs.filter((r) => {
    const okFilter =
      filter === "all" ||
      (filter === "attended"
        ? !!r.attended_at
        : r.status === filter);

    return okFilter && (
      !term ||
      [
        r.full_name,
        r.trx_id,
        r.ssc_batch,
        r.phone,
        r.reg_code,
        r.profession,
      ].some((v) => String(v || "").toLowerCase().includes(term))
    );
  }), [regs, filter, term]);

  async function act(r, action, value) {
    if (action === "delete" && !confirm(t(lang, "confirmDelete"))) return;
    let mainPassword = "";
    const restricted = action === "delete" || (["attended", "gift_received", "food_received"].includes(action) && value === false);
    if (restricted) {
      mainPassword = window.prompt(tr(lang, "এই কাজের জন্য Main Admin Password দিন:", "Enter Main Admin password to authorize this action:")) || "";
      if (!mainPassword) return;
    }

    if (
      action === "reject" &&
      !confirm(
        tr(
          lang,
          `${r.full_name}-এর নিবন্ধন বাতিল করবেন?`,
          `Reject the registration of ${r.full_name}?`
        )
      )
    ) {
      return;
    }

    setBusyId(r.id);
    setMsg(null);

    const res = await send("/api/admin/registration", {
      id: r.id,
      action,
      value,
      main_password: mainPassword,
    });

    setBusyId("");

    if (res.ok) {
      if (action === "approve" && r.email && res.data?.email_sent === false) {
        setMsg({ type: "error", text: tr(lang, "নিবন্ধন অনুমোদিত হয়েছে, কিন্তু Approval Email পাঠানো যায়নি। Email History দেখুন।", "Registration approved, but the approval email could not be sent. Check Email History.") });
      }
      router.refresh();
      return;
    }

    setMsg({
      type: "error",
      text: failText(res, t(lang, "actionFailed"), tr, lang),
    });
  }

  const filters = [
    ["pending", t(lang, "pending")],
    ["approved", t(lang, "approved")],
    ["rejected", t(lang, "rejected")],
    ["attended", tr(lang, "উপস্থিত", "Attended")],
    ["all", t(lang, "all")],
  ];

  function statusText(label, date) {
    if (!date) return null;

    return (
      <div className="success-panel compact">
        ✓ {label}:{" "}
        {new Date(date).toLocaleString(locale, {
          timeZone: "Asia/Dhaka",
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </div>
    );
  }

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          placeholder={t(lang, "search")}
          aria-label={t(lang, "search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {role === "main" && <a className="btn ghost" href="/api/admin/export" download>
          {t(lang, "download")}
        </a>}
      </div>

      <div className="tabs" role="group" aria-label={t(lang, "registrations")}>
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={"btn chip " + (filter === key ? "" : "ghost")}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {msg && (
        <p
          className={msg.type === "error" ? "error-panel" : "success-panel"}
          role="alert"
        >
          {msg.text}
        </p>
      )}

      {list.length === 0 && (
        <p className="card">{t(lang, "noRecords")}</p>
      )}

      {list.map((r) => {
        const busy = busyId === r.id;

        return (
          <article className="card item" key={r.id}>
            {r.photo_url ? (
              <a
                href={r.photo_url}
                target="_blank"
                rel="noreferrer"
                aria-label={tr(lang, "ছবি বড় করে দেখুন", "Open photo")}
              >
                <img
                  className="avatar"
                  src={r.photo_url}
                  alt={r.full_name}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ) : (
              <div className="avatar placeholder" aria-hidden="true">
                {Array.from(r.full_name || "?")[0]}
              </div>
            )}

            <div>
              <div className="item-title">
                <b>{r.full_name}</b>{" "}
                <span className={"badge " + r.status}>
                  {t(lang, r.status)}
                </span>
              </div>

              <div className="item-meta">
                <span>
                  {t(lang, "sscBatchLabel")}: <b>{r.ssc_batch}</b>
                </span>

                <span>
                  {t(lang, "profession")}: {r.profession || "—"}
                </span>

                {r.phone && (
                  <span>
                    {t(lang, "phoneLabel")}:{" "}
                    <a href={"tel:" + r.phone}>{r.phone}</a>
                  </span>
                )}
                {r.email && <span>Email: <a href={"mailto:" + r.email}>{r.email}</a></span>}
                {r.tshirt_size && <span>T-shirt: <b>{r.tshirt_size}</b></span>}

                <span>
                  {t(lang, "transactionLabel")}: <b>{r.trx_id}</b>
                  {r.pay_method && (
                    <span className="tag">
                      {r.pay_method === "bank"
                        ? tr(lang, "ব্যাংক", "Bank")
                        : r.pay_method === "nagad"
                        ? "Nagad"
                        : "bKash"}
                    </span>
                  )}
                </span>

                {r.reg_code && (
                  <span>
                    ID: <b>{r.reg_code}</b>
                  </span>
                )}

                <span className="muted">
                  {new Date(r.created_at).toLocaleString(locale, {
                    timeZone: "Asia/Dhaka",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>

              {/* Attendance, Gift and Food status */}
              {statusText(
                tr(lang, "উপস্থিতি", "Attendance"),
                r.attended_at
              )}

              {statusText(
                tr(lang, "গিফট গ্রহণ", "Gift received"),
                r.gift_received_at
              )}

              {statusText(
                tr(lang, "খাবার গ্রহণ", "Food received"),
                r.food_received_at
              )}

              <div className="row">
                {r.status !== "approved" && (
                  <button
                    type="button"
                    className="btn ok small"
                    disabled={busy}
                    onClick={() => act(r, "approve")}
                  >
                    {t(lang, "approve")}
                  </button>
                )}

                {r.status === "pending" && (
                  <button
                    type="button"
                    className="btn bad small"
                    disabled={busy}
                    onClick={() => act(r, "reject")}
                  >
                    {t(lang, "reject")}
                  </button>
                )}

                {role === "main" && r.status !== "pending" && (
                  <button
                    type="button"
                    className="btn ghost small"
                    disabled={busy}
                    onClick={() => act(r, "pending")}
                  >
                    {tr(lang, "অপেক্ষমাণে ফেরান", "Move to pending")}
                  </button>
                )}

                {r.status === "approved" && (
                  <>
                    {/* Attendance Mark / Unmark */}
                    <button
                      type="button"
                      className="btn ghost small"
                      disabled={busy}
                      onClick={() =>
                        act(r, "attended", !r.attended_at)
                      }
                    >
                      {r.attended_at
                        ? tr(lang, "উপস্থিতি বাতিল", "Undo attendance")
                        : tr(lang, "উপস্থিত চিহ্নিত করুন", "Mark attended")}
                    </button>

                    {/* Gift Mark / Unmark */}
                    <button
                      type="button"
                      className="btn ghost small"
                      disabled={busy}
                      onClick={() =>
                        act(r, "gift_received", !r.gift_received_at)
                      }
                    >
                      {r.gift_received_at
                        ? tr(lang, "গিফট গ্রহণ বাতিল", "Undo gift received")
                        : tr(lang, "গিফট গ্রহণ চিহ্নিত করুন", "Mark gift received")}
                    </button>

                    {/* Food Mark / Unmark */}
                    <button
                      type="button"
                      className="btn ghost small"
                      disabled={busy}
                      onClick={() =>
                        act(r, "food_received", !r.food_received_at)
                      }
                    >
                      {r.food_received_at
                        ? tr(lang, "খাবার গ্রহণ বাতিল", "Undo food received")
                        : tr(lang, "খাবার গ্রহণ চিহ্নিত করুন", "Mark food received")}
                    </button>

                    {/* Phone visibility */}
                    <button
                      type="button"
                      className="btn ghost small"
                      disabled={busy}
                      onClick={() =>
                        act(r, "phone_public", !r.phone_public)
                      }
                    >
                      {r.phone_public
                        ? tr(lang, "ফোন গোপন করুন", "Hide phone")
                        : tr(lang, "ফোন প্রকাশ করুন", "Publish phone")}
                    </button>
                  </>
                )}

                {role === "main" && <button
                  type="button"
                  className="btn ghost small danger-text"
                  disabled={busy}
                  onClick={() => act(r, "delete")}
                >
                  {t(lang, "delete")}
                </button>}
              </div>
            </div>
          </article>
        );
      })}
    </>
  );
}
