# v8.6 — Ki ki bodlano hoyeche

## Security / reliability
- **Bulk CSV export** (`registrations/bulk-export`): ager version-e Excel formula-injection guard chhilo na. Ekhon shared `lib/csv.js` use kore (`=`, `+`, `-`, `@` diye shuru hole `'` prefix hoy).
- **Export audit log**: Main export ar bulk export duto-i ekhon Activity Log-e `export_csv` hishebe lekha hoy (kon admin, koyta row). Full export-e rate limit (10/min) ar shudhu dorkari column select kora hoy.
- **CSV format**: CRLF line ending + UTF-8 BOM (Excel-e Bangla thik dekhay).
- **Email headers**: `Date` ar `Message-ID` header jora hoyeche, MIME boundary ekhon random (spam-e jaoar chance kome). Logic `lib/mime.js`-e, test shoho.
- **Rate-limit cleanup**: `cleanup_expired_rate_limits` function schema-te chhilo kintu kothao call hoto na. Ekhon cron (`/api/cron/email-outbox`) cholar shomoy call hoy.

## Design / UX
- **Serif heading font** (Noto Serif Bengali) hero ar section heading-e.
- **Text size button (A+)** header-e: 100% → 112% → 125%, device-e mone rakhe.
- **Loading skeleton** (spinner-er shathe).
- **Alumni directory**: 60 ta kore card, "আরও দেখুন / Show more" button.
- **Gate scanner**: sound + vibration (ok / already-entered / error) ar result card-e sobuj / holud rong.
- **Backdrop blur fallback**: `prefers-reduced-transparency` ba unsupported browser-e blur bondho.

## Dev
- `tests/csv.test.mjs`, `tests/mime.test.mjs` (total 9 ta unit test pass kore: `npm run test:unit`).
- `.github/workflows/ci.yml`: push/PR-e test + `next build`.

## Jegulo ei version-e kora hoyni
- Google Fonts self-host (`next/font`) ar `next/image`: npm install / network lagbe, tai ekhane build kora jayni.
- Nonce-based CSP: build/browser-e test chhara korle site bhenge jete pare.
- Offline card (service worker).
- Rejected registration-er photo auto-cleanup.
- Same phone + naam-er DB-level unique index (naam normalize logic app-e ache, DB-te hubohu kora jay na).

## Deploy-er age
1. `npm install && npm run test:unit && npm run build`
2. Vercel Hobby-te cron din-e ekbar; fail email tatkhanik retry korte Admin → Email History theke retry korun.

---

# v8.7 — Motion + 2024 profile + soft light mode

- **Scroll Reveal (notun system)**: `ScrollEffects.js`. Je kono element-e `data-reveal="up|left|right|zoom|fade"` dile scroll-e animate hoy; `data-reveal-stagger` dile children ek-ek kore ashe. Home-er grid (info, facts, links, steps, FAQ) ar Alumni directory-te lagano hoyeche. Admin page-e bondho. Reduced-motion / no-JS-e shob content shobshomoy dekha jay. Hover effect bhange na (animation use kora, transform override kore na).
- **Animated Number Counter**: age theke chhilo, ekhon Alumni-er "verified alumni" count-eo jora hoyeche.
- **Scroll progress bar** (upore sona-sobuj line) + **Back-to-top button**.
- **2024 Profile redesign**: 4 ta stat card (Students 911, Teachers 25, Staff 7, ar hishab kora "≈ 36 : 1" students per teacher), year badge, source, hover lift, stagger reveal, mobile-e 2x2 grid.
- **Light mode-e pure white nei**: surface `#f3f7ef`, header ar logo plate soft cream-green, text `--on-brand` `#f8fbf5`. (Print stylesheet ar hero photo-r upor dot-e shudhu soft tone.)

---

# v8.7.1 — Hydration error fix + aro effect

- **Fix: "A tree hydrated but some attributes of the server rendered HTML didn't match"**. Karon: `ScrollEffects` React hydrate hoyar age-i element-e `class`/`style`/`data-reveal` bosachchhilo. Ekhon reveal Web Animations API (`el.animate`) diye hoy, ja DOM attribute-e kono poriborton kore na. Server-e shudhu `data-reveal-stagger` lekha thake (ja server ar client duto-te same). Headless Chromium-e verify kora: paused obosthay hidden, DOM ekdom unchanged, shesh hole normal.
- **Confetti**: registration submit holei ekbar confetti burst (reduced-motion-e hoy na).
- **Heading underline**: section heading-er niche sona-sobuj line; supporting browser-e scroll-er shathe ankhe ashe (CSS scroll-driven animation), baki browser-e static line.
- **Profile card**: icon halka bhasha, "2024 PROFILE" badge-e shimmer.
- **Card hover glow** (info tile, school fact, alumni card, step).
