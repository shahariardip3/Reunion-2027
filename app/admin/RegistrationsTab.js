
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t, tr } from "../../lib/i18n";
import { send, failText } from "./api";

export default function RegistrationsTab({ regs, lang = "en", role = "main" }) {
  const router = useRouter();

  const [filter, setFilter] = useState("pending");
  const [q, setQ] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

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
      (filter === "attended" ? !!r.attended_at
        : r.status === filter);

    return okFilter && (batchFilter === "all" || r.ssc_batch === batchFilter) && (methodFilter === "all" || r.pay_method === methodFilter) && (
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
  }), [regs, filter, term, batchFilter, methodFilter]);

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
      if (action === "approve" && r.email && res.data?.email_queued === false && res.data?.email_sent !== true) {
        setMsg({ type: "error", text: tr(lang, "নিবন্ধন অনুমোদিত হয়েছে, কিন্তু email queue-তে যোগ করা যায়নি।", "Registration approved, but the approval email could not be queued.") });
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

  const batches = [...new Set(regs.map((r) => r.ssc_batch).filter(Boolean))].sort((a,b) => Number(b)-Number(a));

  async function exportSelected() {
    if (!selected.length || selected.length > 500) return;
    const response = await fetch("/api/admin/registrations/bulk-export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selected }) });
    if (!response.ok) { const data = await response.json().catch(() => ({})); setMsg({ type: "error", text: data.error || "Export failed." }); return; }
    const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "reunion-selected-registrations.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function bulk(action) {
    if (!selected.length || bulkBusy) return;
    if (!window.confirm(`Apply ${action} to ${selected.length} selected registrations?`)) return;
    setBulkBusy(true); setMsg(null);
    const res = await send("/api/admin/registrations/bulk", { ids: selected, action });
    setBulkBusy(false);
    if (!res.ok) { setMsg({ type: "error", text: res.data?.error || "Bulk action failed." }); return; }
    setSelected([]); setMsg({ type: res.data.failed ? "error" : "ok", text: `${res.data.succeeded} completed, ${res.data.failed} failed.` }); router.refresh();
  }

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
        <select aria-label="Filter by SSC batch" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}><option value="all">All batches</option>{batches.map((batch) => <option key={batch} value={batch}>{batch}</option>)}</select>
        <select aria-label="Filter by payment method" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}><option value="all">All payment methods</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank</option></select>
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

      {role === "main" && <div className="toolbar"><button className="btn ghost small" type="button" onClick={() => setSelected(list.slice(0, 50).map((r) => r.id))}>Select first 50 visible</button><button className="btn ghost small" type="button" onClick={() => setSelected([])}>Clear</button><span>{selected.length} selected</span><button className="btn ghost small" disabled={!selected.length || selected.length > 500} onClick={exportSelected}>Export selected</button><button className="btn ok small" disabled={!selected.length || bulkBusy} onClick={() => bulk("approve")}>Bulk approve</button><button className="btn bad small" disabled={!selected.length || bulkBusy} onClick={() => bulk("reject")}>Bulk reject</button></div>}
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
            {role === "main" && <label className="bulk-select"><input type="checkbox" checked={selected.includes(r.id)} onChange={(e) => setSelected((old) => e.target.checked ? [...old, r.id] : old.filter((id) => id !== r.id))} /> Select</label>}
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
