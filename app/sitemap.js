import { siteUrl } from "../lib/site";

export default function sitemap() {
  const base = siteUrl();
  if (!base) return [];
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/notice`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/alumni`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/history`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/memories`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/reunion-gallery`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];
}
