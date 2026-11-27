import { db } from "./supabase";

const CATEGORIES = new Set(["memories", "reunion"]);
const BUCKET = "gallery-photos";

/** Thumbnails are stored next to the full photo: "memories/<id>.jpg" -> "memories/<id>-thumb.jpg". */
export const thumbPathFor = (storagePath) => String(storagePath || "").replace(/\.[a-z0-9]+$/i, "-thumb.jpg");

/**
 * Photos of ONE category (newest first). Each category is queried on its own,
 * so a busy category can never push another one off the page.
 */
export async function getGalleryPhotos(category = null, limit = 200) {
  try {
    const sb = db();
    let query = sb.from("gallery_photos")
      .select("id,category,title_bn,title_en,storage_path,created_at,is_pinned,sort_order,updated_at")
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(Number(limit) || 200, 500)));
    if (category && CATEGORIES.has(category)) query = query.eq("category", category);
    const { data, error } = await query;
    if (error || !data) return [];
    const bucket = sb.storage.from(BUCKET);
    // Older installations may contain legacy rows created before storage_path
    // existed. They cannot be resolved to Storage objects automatically.
    return data.filter((photo) => typeof photo.storage_path === 'string' && photo.storage_path.length > 0).map((photo) => ({
      ...photo,
      image_url: bucket.getPublicUrl(photo.storage_path).data.publicUrl,
      // Photos uploaded before thumbnails existed have no thumb file; the gallery falls back to image_url on error.
      thumb_url: bucket.getPublicUrl(thumbPathFor(photo.storage_path)).data.publicUrl,
    }));
  } catch {
    // Keeps the public site usable until the gallery migration is applied.
    return [];
  }
}

/** Real number of photos in a category (the home page only loads a few of them). */
export async function getGalleryCount(category) {
  if (!CATEGORIES.has(category)) return 0;
  try {
    const { count, error } = await db().from("gallery_photos").select("id", { count: "exact", head: true }).eq("category", category).not("storage_path", "is", null);
    return error ? 0 : count || 0;
  } catch {
    return 0;
  }
}
