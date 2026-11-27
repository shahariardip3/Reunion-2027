"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { tr } from "../lib/i18n";

const digits = (lang, n) => new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US", { useGrouping: false }).format(n);

function photoTitle(photo, lang, index, category) {
  const value = lang === "bn" ? photo.title_bn : photo.title_en;
  if (value) return value;
  const n = digits(lang, index + 1);
  return category === "memories"
    ? tr(lang, `স্মৃতির ছবি ${n}`, `Memory photo ${n}`)
    : tr(lang, `পুনর্মিলনীর ছবি ${n}`, `Reunion photo ${n}`);
}

export default function SchoolMemoryGallery({ lang = "bn", photos = [], category = "memories", compact = false }) {
  const [selected, setSelected] = useState(-1);
  const [loaded, setLoaded] = useState({});
  const touch = useRef(null);
  const closeBtn = useRef(null);
  const opener = useRef(null);
  const visiblePhotos = compact ? photos.slice(0, 6) : photos;
  const count = visiblePhotos.length;
  const title = (photo, index) => photoTitle(photo, lang, index, category);
  const step = (delta) => setSelected((v) => (v < 0 || !count ? v : (v + delta + count) % count));
  const markLoaded = (key) => setLoaded((l) => (l[key] ? l : { ...l, [key]: true }));

  // Photos uploaded before thumbnails existed have no thumb file: fall back to the full image once.
  const onThumbError = (photo, key) => (event) => {
    const img = event.currentTarget;
    if (!img.dataset.fallback && photo.image_url) { img.dataset.fallback = "1"; img.src = photo.image_url; }
    else markLoaded(key);
  };

  const isOpen = selected >= 0;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event) => {
      if (event.key === "Escape") setSelected(-1);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("gallery-modal-open");
    closeBtn.current?.focus();
    const from = opener.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("gallery-modal-open");
      from?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, count]);

  // Warm up the neighbouring full-size photos so next/previous feels instant.
  useEffect(() => {
    if (selected < 0 || count < 2) return;
    for (const d of [1, -1]) {
      const p = visiblePhotos[(selected + d + count) % count];
      if (p?.image_url) { const img = new Image(); img.src = p.image_url; }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, count]);

  if (!count) {
    return (
      <div className="gallery-empty-state">
        <span className="gallery-empty-icon" aria-hidden="true">▧</span>
        <strong>{tr(lang, "ছবি শিগগিরই যোগ করা হবে", "Photos will be added soon")}</strong>
        <p>{tr(lang, "অ্যাডমিন ছবি আপলোড করলে এখানে দেখা যাবে।", "Photos will appear here after the admin uploads them.")}</p>
      </div>
    );
  }

  const onTouchStart = (e) => { const p = e.touches[0]; touch.current = { x: p.clientX, y: p.clientY }; };
  const onTouchEnd = (e) => {
    const s = touch.current; touch.current = null;
    if (!s) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - s.x, dy = p.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) setSelected(-1);
  };

  const current = visiblePhotos[selected];

  return (
    <>
      <div className="memory-gallery" aria-label={tr(lang, "ছবির গ্যালারি", "Photo gallery")}>
        {visiblePhotos.map((photo, index) => {
          const key = photo.id || photo.image_url;
          return (
            <button
              className={`memory-photo memory-photo-${(index % 7) + 1}${loaded[key] ? " is-loaded" : ""}`}
              key={key}
              type="button"
              onClick={(e) => { opener.current = e.currentTarget; setSelected(index); }}
              aria-label={tr(lang, `বড় করে দেখুন: ${title(photo, index)}`, `View larger: ${title(photo, index)}`)}
            >
              <img
                src={photo.thumb_url || photo.image_url}
                alt={title(photo, index)}
                loading="lazy"
                decoding="async"
                ref={(el) => { if (el?.complete && el.naturalWidth && !loaded[key]) markLoaded(key); }}
                onLoad={() => markLoaded(key)}
                onError={onThumbError(photo, key)}
              />
              <span className="memory-photo-caption"><b>{title(photo, index)}</b><i aria-hidden="true">↗</i></span>
            </button>
          );
        })}
      </div>

      {/* Rendered into <body>: glass cards use backdrop-filter, which would trap a position:fixed overlay inside the card. */}
      {isOpen && current && typeof document !== "undefined" && createPortal(
        <div className="memory-lightbox" role="dialog" aria-modal="true" aria-label={title(current, selected)} onClick={() => setSelected(-1)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button ref={closeBtn} className="memory-lightbox-close" type="button" aria-label={tr(lang, "বন্ধ করুন", "Close")} onClick={() => setSelected(-1)}>×</button>
          <button className="memory-lightbox-nav prev" type="button" aria-label={tr(lang, "আগের ছবি", "Previous photo")} onClick={(event) => { event.stopPropagation(); step(-1); }}>‹</button>
          <figure onClick={(event) => event.stopPropagation()} key={selected}>
            <img src={current.image_url} alt={title(current, selected)} />
            <figcaption>{title(current, selected)}<small>{digits(lang, selected + 1)} / {digits(lang, count)}</small></figcaption>
          </figure>
          <button className="memory-lightbox-nav next" type="button" aria-label={tr(lang, "পরের ছবি", "Next photo")} onClick={(event) => { event.stopPropagation(); step(1); }}>›</button>
        </div>,
        document.body
      )}
    </>
  );
}
