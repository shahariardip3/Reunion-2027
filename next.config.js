const PHASE_DEVELOPMENT_SERVER = "phase-development-server"; // same value as next/constants

/**
 * Security headers (CSP etc.) are applied ONLY to the real (production) site.
 * In `npm run dev` a strict CSP blocks Next's development scripts and the page
 * silently stops responding (buttons, language, login...), so dev gets none.
 */
module.exports = (phase) => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline'",
    "media-src 'self' blob:",
  ].join("; ");

  const prodHeaders = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=31536000" },
  ];

  return {
    poweredByHeader: false,
    reactStrictMode: true,
    devIndicators: false,
    // Lets you open `npm run dev` from a phone on the same Wi-Fi (http://192.168.x.x:3000).
    allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*", "172.17.*.*", "172.18.*.*", "*.local"],
    async headers() {
      const cache = ["/logo.png", "/logo-128.png", "/logo-256.png", "/logo-384.png", "/school-gate.jpg", "/school-gate-640.jpg", "/images/school-gate-hero.webp", "/images/school-gate-portrait.jpg", "/og-image.jpg"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      }));
      if (isDev) return [{ source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] }];
      return [{ source: "/:path*", headers: prodHeaders }, ...cache];
    },
  };
};
