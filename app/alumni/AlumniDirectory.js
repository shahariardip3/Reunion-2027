"use client";
import { useMemo, useState } from "react";
import { t, tr } from "../../lib/i18n";

export default function AlumniDirectory({ alumni, lang = "en" }) {
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("");
  const nf = useMemo(() => new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { useGrouping: false }), [lang]);

  const batches = useMemo(() => [...new Set(alumni.map((a) => a.ssc_batch))].sort(), [alumni]);
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
  const shown = Object.values(groups).reduce((n, list) => n + list.length, 0);

  return <>
    <section className="directory-hero">
      <span className="eyebrow">GANGANANDAPUR ALUMNI NETWORK</span>
      <h1>{t(lang, "alumniTitle")}</h1>
      <p>{t(lang, "alumniSub")}</p>
      <div className="directory-count">{nf.format(alumni.length)} {t(lang, "verifiedAlumni")}</div>
    </section>

    {alumni.length > 0 && (
      <div className="directory-filters">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(lang, "searchAlumni")} aria-label={t(lang, "searchAlumni")} />
        <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label={t(lang, "ssc")}>
          <option value="">{t(lang, "allBatches")}</option>
          {batches.map((b) => <option key={b} value={b}>{t(lang, "ssc")} {b}</option>)}
        </select>
      </div>
    )}

    {alumni.length === 0 && <p className="card">{t(lang, "noApproved")}</p>}
    {alumni.length > 0 && shown === 0 && <p className="card" role="status">{t(lang, "noMatch")}</p>}

    {Object.entries(groups).map(([b, list]) => (
      <section key={b} className="batch-section">
        <div className="batch-heading"><h2>{t(lang, "ssc")} {b}</h2><span>{nf.format(list.length)} {t(lang, "members")}</span></div>
        <div className="alumni-grid">
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
  </>;
}
