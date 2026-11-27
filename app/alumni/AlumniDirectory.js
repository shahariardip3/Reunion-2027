"use client";
import { useMemo, useState } from "react";
import { t, tr } from "../../lib/i18n";
import CountUp from "../CountUp";

const PAGE = 60; // cards rendered at a time; keeps large batches light on phones

export default function AlumniDirectory({ alumni, lang = "en" }) {
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const nf = useMemo(() => new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { useGrouping: false }), [lang]);

  const batches = useMemo(() => [...new Set(alumni.map((a) => a.ssc_batch))].sort().reverse(), [alumni]);
  const batchCounts = useMemo(() => {
    const out = {};
    for (const a of alumni) out[a.ssc_batch] = (out[a.ssc_batch] || 0) + 1;
    return out;
  }, [alumni]);
  const pickBatch = (b) => { setBatch(b); setLimit(PAGE); };
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = {};
    for (const a of alumni) {
      if (batch && a.ssc_batch !== batch) continue;
      if (term && !`${a.full_name} ${a.profession}`.toLowerCase().includes(term)) continue;
      (out[a.ssc_batch] ||= []).push(a);
    }
    return out;
  }, [alumni, q, batch]);
  const visible = useMemo(() => {
    let left = limit;
    const out = [];
    for (const [b, list] of Object.entries(groups)) {
      if (left <= 0) break;
      out.push([b, list.slice(0, left), list.length]);
      left -= list.length;
    }
    return out;
  }, [groups, limit]);
  const shown = Object.values(groups).reduce((n, list) => n + list.length, 0);

  return <>
    <section className="directory-hero">
      <span className="eyebrow">{tr(lang, "গঙ্গানন্দপুর প্রাক্তন শিক্ষার্থী নেটওয়ার্ক", "GANGANANDAPUR ALUMNI NETWORK")}</span>
      <h1>{t(lang, "alumniTitle")}</h1>
      <p>{t(lang, "alumniSub")}</p>
      <div className="directory-count"><CountUp value={alumni.length} lang={lang} /> {t(lang, "verifiedAlumni")}</div>
    </section>

    {alumni.length > 0 && (
      <div className="directory-filters">
        <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder={t(lang, "searchAlumni")} aria-label={t(lang, "searchAlumni")} />
      </div>
    )}
    {batches.length > 1 && (
      <div className="batch-chips" role="group" aria-label={t(lang, "ssc")}>
        <button type="button" className={`batch-chip${batch === "" ? " is-on" : ""}`} aria-pressed={batch === ""} onClick={() => pickBatch("")}>
          {t(lang, "allBatches")} <small>{nf.format(alumni.length)}</small>
        </button>
        {batches.map((b) => (
          <button key={b} type="button" className={`batch-chip${batch === b ? " is-on" : ""}`} aria-pressed={batch === b} onClick={() => pickBatch(b)}>
            {nf.format(Number(b))} <small>{nf.format(batchCounts[b])}</small>
          </button>
        ))}
      </div>
    )}

    {alumni.length === 0 && <p className="card">{t(lang, "noApproved")}</p>}
    {alumni.length > 0 && shown === 0 && <p className="card" role="status">{t(lang, "noMatch")}</p>}

    {visible.map(([b, list, total]) => (
      <section key={b} className="batch-section">
        <div className="batch-heading"><h2>{t(lang, "ssc")} {nf.format(Number(b))}</h2><span>{nf.format(total)} {t(lang, "members")}</span></div>
        <div className="alumni-grid" data-reveal-stagger>
          {list.map((r) => (
            <article className="alumni-card" key={r.id}>
              {r.photo_url
                ? <img className="alumni-photo" alt={r.full_name} src={r.photo_url} width="76" height="88" loading="lazy" decoding="async" />
                : <div className="alumni-photo placeholder" aria-hidden="true">{Array.from(r.full_name)[0]}</div>}
              <div className="alumni-info">
                <h3>{r.full_name}</h3>
                <p>{r.profession || t(lang, "noProfession")}</p>
                {r.phone && <a className="alumni-phone" href={`tel:${r.phone}`}>{r.phone}</a>}
              </div>
            </article>
          ))}
        </div>
      </section>
    ))}
    {shown > limit && (
      <div className="directory-more">
        <button type="button" className="btn ghost" onClick={() => setLimit((n) => n + PAGE)}>
          {tr(lang, "আরও দেখুন", "Show more")} ({nf.format(shown - limit)})
        </button>
      </div>
    )}
  </>;
}
