import { siteUrl } from "../lib/site";

export default function robots() {
  const base = siteUrl();
  const config = { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/card", "/status"] } };
  if (base) { config.sitemap = `${base}/sitemap.xml`; config.host = base; }
  return config;
}
