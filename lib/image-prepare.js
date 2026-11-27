// Browser-side helper: shrinks a gallery photo BEFORE upload so it always fits Vercel's ~4.5 MB request limit,
// and makes a small thumbnail so the public galleries load fast.

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The image could not be read.")); };
    img.src = url;
  });

const toBlob = (canvas, quality) =>
  new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality));

function draw(img, side) {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // JPEG has no transparency
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export const GALLERY_FULL_MAX_BYTES = 3 * 1024 * 1024;   // keep in sync with app/api/admin/gallery/route.js
export const GALLERY_THUMB_MAX_BYTES = 400 * 1024;

/** Returns { full: File|Blob, thumb: Blob|null }. */
export async function prepareGalleryImage(file, { maxSide = 2200, thumbSide = 640, targetBytes = 2.6 * 1024 * 1024 } = {}) {
  const img = await loadImage(file);
  const largest = Math.max(img.naturalWidth, img.naturalHeight);

  // Always re-encode through canvas. This strips EXIF/GPS metadata even when
  // the uploaded source is already small; never pass the original file through.
  let full = null;
  let side = Math.min(maxSide, largest);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = draw(img, side);
    for (const quality of [0.88, 0.82, 0.76, 0.68, 0.60]) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= targetBytes) { full = blob; break; }
    }
    if (full) break;
    side = Math.max(480, Math.round(side * 0.82));
  }
  if (!full) throw new Error("The image could not be safely optimised. Choose a smaller image.");

  // 2) Thumbnail (optional: the gallery falls back to the full image if it is missing).
  let thumb = null;
  try {
    const canvas = draw(img, thumbSide);
    for (const quality of [0.8, 0.7, 0.6]) {
      thumb = await toBlob(canvas, quality);
      if (thumb && thumb.size <= GALLERY_THUMB_MAX_BYTES) break;
    }
    if (thumb && thumb.size > GALLERY_THUMB_MAX_BYTES) thumb = null;
  } catch { thumb = null; }

  return { full, thumb };
}
