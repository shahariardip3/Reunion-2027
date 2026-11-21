/** Creates signed URLs for many photos with a single storage call. Returns { path: url }. */
export async function signedUrlMap(sb, paths, ttl) {
  const list = [...new Set((paths || []).filter(Boolean))];
  const map = {};
  if (!list.length) return map;
  const { data, error } = await sb.storage.from("photos").createSignedUrls(list, ttl);
  if (!error) for (const item of data || []) if (item?.signedUrl) map[item.path] = item.signedUrl;
  return map;
}
