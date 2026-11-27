export const runtime = "nodejs";
import crypto from "crypto";
import { db } from "../../../../lib/supabase";
import { getAdminSession } from "../../../../lib/auth";
import { csrfGuard, rateLimit, validImageSignature } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";
import { writeAudit } from "../../../../lib/audit-log";
import { thumbPathFor } from "../../../../lib/gallery";
import { insertCompat, uploadCompat } from "../../../../lib/db-compat";

const BUCKET = "gallery-photos";
// Vercel rejects request bodies above ~4.5 MB, so the photo (+ its thumbnail) must stay well below that.
// The admin page shrinks photos in the browser first (lib/image-prepare.js keeps the same numbers).
const MAX_BYTES = 3 * 1024 * 1024;
const THUMB_MAX_BYTES = 400 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const CATEGORIES = new Set(["memories", "reunion"]);
const cleanTitle = (value) => String(value || "").normalize("NFC").trim().replace(/\s+/g, " ").replace(/[<>\u0000-\u001f]/g, "").slice(0, 120);
const imageUrl = (sb, path) => sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

export async function POST(req) {
  const session = await getAdminSession();
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "main") return fail("Only Main Admin can upload gallery photos.", 403);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-gallery-upload", 20, 60); if (limited) return limited;
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BYTES + THUMB_MAX_BYTES + 256 * 1024) return fail("Photo upload is too large.", 413);
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid upload form.");
  const category = String(form.get("category") || "");
  if (!CATEGORIES.has(category)) return fail("Invalid gallery category.");
  const file = form.get("photo");
  if (!file || typeof file.arrayBuffer !== "function") return fail("Choose a photo to upload.");
  if (!TYPES[file.type]) return fail("Only JPG, PNG or WebP photos are allowed.");
  if (file.size < 1 || file.size > MAX_BYTES) return fail("Photo must be smaller than 3 MB. Choose the photo again so it can be optimised automatically.", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return fail("The uploaded file is not a valid image.");
  // Optional small JPEG thumbnail made by the browser. Never fails the upload.
  let thumbBytes = null;
  const thumb = form.get("thumb");
  if (thumb && typeof thumb.arrayBuffer === "function" && thumb.size > 0 && thumb.size <= THUMB_MAX_BYTES) {
    const candidate = Buffer.from(await thumb.arrayBuffer());
    if (validImageSignature(candidate, "image/jpeg")) thumbBytes = candidate;
  }
  const titleBn = cleanTitle(form.get("title_bn"));
  const titleEn = cleanTitle(form.get("title_en"));
  const fileId = crypto.randomUUID();
  const storagePath = `${category}/${fileId}.${TYPES[file.type]}`;
  const sb = db();
  const upload = await uploadCompat(sb, BUCKET, storagePath, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false }, { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (upload.error) return dbFail("gallery:upload", "Photo upload failed. Check the gallery storage bucket and run the latest schema.sql.", upload.error, { admin: true });
  if (thumbBytes) {
    const thumbUp = await sb.storage.from(BUCKET).upload(thumbPathFor(storagePath), thumbBytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
    if (thumbUp.error) console.error("[gallery] thumbnail upload failed:", thumbUp.error.message);
  }
  // mime_type / size_bytes / uploaded_by are optional columns: older databases still accept the photo without them.
  
const { data, error } = await insertCompat(
  sb,
  "gallery_photos",
  {
    category,
    title_bn: titleBn,
    title_en: titleEn,
    storage_path: storagePath,
    file_path: storagePath,
    mime_type: file.type,
    size_bytes: bytes.length,
    uploaded_by: session.name || session.username || "Main Admin"
  },
  ["mime_type", "size_bytes", "uploaded_by"],
  "id,category,title_bn,title_en,storage_path,created_at"
);

  if (error) {
    await sb.storage.from(BUCKET).remove([storagePath, thumbPathFor(storagePath)]);
    return dbFail("gallery:insert", "Photo details could not be saved. Run the latest schema.sql.", error, { admin: true });
  }
  await writeAudit("gallery_photo_uploaded", null, { photo_id: data.id, category, title_en: titleEn });
  return json({ ok: true, photo: { ...data, image_url: imageUrl(sb, storagePath), thumb_url: imageUrl(sb, thumbPathFor(storagePath)) } });
}

export async function DELETE(req) {
  const session = await getAdminSession();
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "main") return fail("Only Main Admin can delete gallery photos.", 403);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-gallery-delete", 30, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return fail("Invalid photo ID.");
  const sb = db();
  const { data: photo, error: readError } = await sb.from("gallery_photos").select("id,category,title_bn,title_en,storage_path").eq("id", body.id).maybeSingle();
  if (readError) return dbFail("gallery:delete-read", "Could not read gallery photo.", readError, { admin: true });
  if (!photo) return fail("Gallery photo not found.", 404);
  if (!photo.storage_path) return fail("This older gallery record has no Storage path. Its database record was kept; repair or remove this legacy record manually.", 409);
  // Remove the object first. If Storage refuses the deletion, keep its DB row
  // so the Main Admin can retry instead of losing the only reference to it.
  const { error: storageError } = await sb.storage.from(BUCKET).remove([photo.storage_path]);
  if (storageError) return dbFail("gallery:delete-storage", "Could not delete the photo from Storage. The gallery entry was kept so you can retry.", storageError, { admin: true });
  // The thumbnail is best-effort: older photos have none.
  await sb.storage.from(BUCKET).remove([thumbPathFor(photo.storage_path)]).catch(() => {});
  const { error: deleteError } = await sb.from("gallery_photos").delete().eq("id", photo.id);
  if (deleteError) return dbFail("gallery:delete-row", "The image file was deleted, but its gallery record could not be removed. Retry the delete action.", deleteError, { admin: true });
  await writeAudit("gallery_photo_deleted", null, { photo_id: photo.id, category: photo.category, storage_removed: true });
  return json({ ok: true, storage_removed: true });
}


export async function PATCH(req) {
  const session = await getAdminSession();
  if (!session) return fail("Unauthorized", 401);
  if (session.role !== "main") return fail("Only Main Admin can edit gallery photos.", 403);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-gallery-edit", 60, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return fail("Invalid photo ID.");
  const patch = {};
  if (body.title_bn !== undefined) {
    if (typeof body.title_bn !== "string" || body.title_bn.length > 120) return fail("Bangla caption must be 120 characters or fewer.");
    patch.title_bn = cleanTitle(body.title_bn);
  }
  if (body.title_en !== undefined) {
    if (typeof body.title_en !== "string" || body.title_en.length > 120) return fail("English caption must be 120 characters or fewer.");
    patch.title_en = cleanTitle(body.title_en);
  }
  if (body.is_pinned !== undefined) {
    if (typeof body.is_pinned !== "boolean") return fail("Invalid pin value.");
    patch.is_pinned = body.is_pinned;
  }
  if (body.sort_order !== undefined) {
    if (!Number.isInteger(body.sort_order) || Math.abs(body.sort_order) > 1000000) return fail("Invalid sort order.");
    patch.sort_order = body.sort_order;
  }
  if (!Object.keys(patch).length) return fail("No changes supplied.");
  patch.updated_at = new Date().toISOString();
  const sb = db();
  const { data, error } = await sb.from("gallery_photos").update(patch).eq("id", body.id).select("id,category,title_bn,title_en,is_pinned,sort_order,updated_at").maybeSingle();
  if (error) return dbFail("gallery:update", "Could not update gallery photo. Apply the v8 database migration.", error, { admin: true });
  if (!data) return fail("Gallery photo not found.", 404);
  await writeAudit("gallery_photo_updated", null, { photo_id: data.id, changes: Object.keys(patch) });
  return json({ ok: true, photo: data });
}
