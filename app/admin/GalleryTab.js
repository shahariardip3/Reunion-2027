"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { tr } from "../../lib/i18n";
import { prepareGalleryImage } from "../../lib/image-prepare";

export default function GalleryTab({ photos = [], lang = "en" }) {
  const [items, setItems] = useState(photos);
  const [category, setCategory] = useState("memories");
  const [titleBn, setTitleBn] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();
  useEffect(() => setItems(photos), [photos]);
  const current = useMemo(() => items.filter((photo) => photo.category === category), [items, category]);

  async function upload(event) {
    event.preventDefault();
    if (!file || busy) return;
    setBusy(true); setMessage(null);
    try {
      const batch = files.length ? files : [file];
      if (batch.length > 15) throw new Error(tr(lang, "একবারে সর্বোচ্চ ১৫টি ছবি নির্বাচন করুন।", "Choose no more than 15 photos per batch."));
      if (batch.some((item) => item.size > 40 * 1024 * 1024)) throw new Error(tr(lang, "একটি বা একাধিক ছবি ৪০ MB-এর বেশি।", "One or more photos exceed 40 MB."));
      // Shrink in the browser first so the upload always fits the hosting request-size limit.
      const uploaded = [];
      for (const selected of batch) {
        const { full, thumb } = await prepareGalleryImage(selected);
        const data = new FormData();
        data.set("category", category); data.set("title_bn", titleBn); data.set("title_en", titleEn);
        data.set("photo", full, selected.name || "photo.jpg");
        if (thumb) data.set("thumb", thumb, "thumb.jpg");
        const response = await fetch("/api/admin/gallery", { method: "POST", body: data });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`${selected.name}: ${result.error || tr(lang, "ছবি আপলোড করা যায়নি।", "Photo upload failed.")}${result.code ? ` [${result.code}${result.detail ? `: ${result.detail}` : ""}]` : ""}`);
        uploaded.push(result.photo);
      }
      setItems((existing) => [...uploaded, ...existing]); setTitleBn(""); setTitleEn(""); setFile(null); setFiles([]);
      const input = document.getElementById("gallery-photo-file"); if (input) input.value = "";
      setMessage({ type: "ok", text: tr(lang, `${uploaded.length}টি ছবি সফলভাবে আপলোড হয়েছে।`, `${uploaded.length} photo(s) uploaded successfully.`) });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error.message || tr(lang, "ছবি আপলোড করা যায়নি।", "Photo upload failed.") });
    } finally { setBusy(false); }
  }

  async function updatePhoto(photo, patch) {
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/gallery", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: photo.id, ...patch }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not update photo.");
      setItems((existing) => existing.map((item) => item.id === photo.id ? { ...item, ...result.photo } : item));
      setEditing(null); setMessage({ type: "ok", text: tr(lang, "ছবির তথ্য আপডেট হয়েছে।", "Photo details updated.") }); router.refresh();
    } catch (error) { setMessage({ type: "error", text: error.message }); }
    finally { setBusy(false); }
  }

  async function remove(photo) {
    if (!window.confirm(tr(lang, "এই ছবিটি স্থায়ীভাবে মুছে ফেলবেন?", "Permanently delete this photo?")) || busy) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/gallery", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: photo.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || tr(lang, "ছবি মুছে ফেলা যায়নি।", "Could not delete the photo."));
      setItems((existing) => existing.filter((item) => item.id !== photo.id));
      setMessage({ type: result.storage_removed === false ? "error" : "ok", text: result.storage_removed === false ? tr(lang, "ছবিটি গ্যালারি থেকে সরানো হয়েছে, তবে Storage থেকে ফাইলটি মুছতে পারেনি। পরে Storage পরীক্ষা করুন।", "The photo was removed from the gallery, but its storage file could not be deleted. Check Storage later.") : tr(lang, "ছবি মুছে ফেলা হয়েছে।", "Photo deleted.") });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error.message || tr(lang, "ছবি মুছে ফেলা যায়নি।", "Could not delete the photo.") });
    } finally { setBusy(false); }
  }

  return (
    <section className="gallery-admin card">
      <div className="gallery-admin-heading"><div><span className="memory-kicker">PHOTO MANAGEMENT</span><h2>{tr(lang, "Photo Gallery Management", "Photo Gallery Management")}</h2><p className="muted">{tr(lang, "দুটি গ্যালারির ছবি এখান থেকে যোগ ও মুছে ফেলুন।", "Upload and manage photos in both public galleries from here.")}</p></div><span className="gallery-admin-count">{items.length} {tr(lang, "টি ছবি", "photos")}</span></div>
      <div className="gallery-admin-switch" role="tablist" aria-label="Choose gallery"><button type="button" className={category === "memories" ? "active" : ""} onClick={() => setCategory("memories")}>{tr(lang, "Memories Gallery", "Memories Gallery")}</button><button type="button" className={category === "reunion" ? "active" : ""} onClick={() => setCategory("reunion")}>{tr(lang, "Reunion Photo Gallery", "Reunion Photo Gallery")}</button></div>
      <form className="gallery-upload-form" onSubmit={upload}>
        <h3>{tr(lang, "নতুন ছবি যোগ করুন", "Add a new photo")}</h3>
        <div className="gallery-upload-fields">
          <label>{tr(lang, "বাংলা ক্যাপশন (ঐচ্ছিক)", "Bangla caption (optional)")}<input value={titleBn} onChange={(event) => setTitleBn(event.target.value)} maxLength={120} placeholder={tr(lang, "ছবির বর্ণনা", "Photo description")} /></label>
          <label>{tr(lang, "English caption (optional)", "English caption (optional)")}<input value={titleEn} onChange={(event) => setTitleEn(event.target.value)} maxLength={120} placeholder="Photo description" /></label>
          <label className="gallery-upload-file">{tr(lang, "ছবি নির্বাচন করুন", "Choose photo")}<input id="gallery-photo-file" type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={(event) => { const chosen = Array.from(event.target.files || []); setFiles(chosen); setFile(chosen[0] || null); }} /><small>{tr(lang, "JPG, PNG বা WebP · বড় ছবি নিজে থেকেই ছোট করে আপলোড হবে", "JPG, PNG or WebP · large photos are optimised automatically")}</small></label>
        </div>
        {message && <p className={message.type === "ok" ? "success-panel" : "error-panel"} role="status">{message.text}</p>}
        <button className="btn gallery-upload-submit" disabled={busy || !file}>{busy ? tr(lang, "আপলোড হচ্ছে…", "Uploading…") : tr(lang, "ছবি আপলোড করুন", "Upload photo")}</button>
      </form>
      <div className="gallery-admin-list-heading"><h3>{category === "memories" ? tr(lang, "Memories Gallery-এর ছবি", "Memories Gallery photos") : tr(lang, "Reunion Gallery-এর ছবি", "Reunion Gallery photos")}</h3><span>{current.length}</span></div>
      {current.length ? <div className="gallery-admin-grid">{current.map((photo) => <article className="gallery-admin-item" key={photo.id}><img src={photo.thumb_url || photo.image_url} loading="lazy" decoding="async" onError={(event) => { const img = event.currentTarget; if (!img.dataset.fallback && photo.image_url) { img.dataset.fallback = "1"; img.src = photo.image_url; } }} alt={photo.title_en || photo.title_bn || "Gallery photo"} /><div>{editing === photo.id ? <><input aria-label="Bangla caption" defaultValue={photo.title_bn || ""} maxLength={120} id={`cap-bn-${photo.id}`} /><input aria-label="English caption" defaultValue={photo.title_en || ""} maxLength={120} id={`cap-en-${photo.id}`} /><button type="button" className="btn small" disabled={busy} onClick={() => updatePhoto(photo, { title_bn: document.getElementById(`cap-bn-${photo.id}`).value, title_en: document.getElementById(`cap-en-${photo.id}`).value })}>Save captions</button></> : <strong>{lang === "bn" ? photo.title_bn || photo.title_en || "ক্যাপশন নেই" : photo.title_en || photo.title_bn || "No caption"}</strong>}<small>{new Date(photo.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB")}</small><button type="button" className="btn small" disabled={busy} onClick={() => setEditing(editing === photo.id ? null : photo.id)}>Edit caption</button><button type="button" className="btn small" disabled={busy} onClick={() => updatePhoto(photo, { is_pinned: !photo.is_pinned })}>{photo.is_pinned ? "Unpin" : "Pin photo"}</button><button type="button" className="btn small" disabled={busy} onClick={() => updatePhoto(photo, { sort_order: (photo.sort_order || 0) - 1 })}>Move up</button><button type="button" className="btn danger small" disabled={busy} onClick={() => remove(photo)}>{tr(lang, "মুছে ফেলুন", "Delete")}</button></div></article>)}</div> : <div className="gallery-empty-state"><strong>{tr(lang, "এখনো কোনো ছবি যোগ করা হয়নি", "No photos added yet")}</strong><p>{tr(lang, "উপরের ফর্ম থেকে প্রথম ছবিটি আপলোড করুন।", "Upload the first photo using the form above.")}</p></div>}
    </section>
  );
}
