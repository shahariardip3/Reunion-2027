# Reunion 2027 — Aesthetic Design Update

এই আপডেটে KUET Convocation website-এর formal university-event presentation থেকে অনুপ্রাণিত হয়ে Ganganandapur High School-এর জন্য আলাদা editorial design direction তৈরি করা হয়েছে। KUET-এর layout/code কপি করা হয়নি।

## Design direction
- Heritage editorial palette: forest green, warm ivory, muted gold.
- Full-bleed school-photo hero with dark cinematic gradient, large serif headline, event actions and optional date/venue line.
- School's supplied photos remain the visual focus; unrelated stock photos are not used as school imagery.
- More generous whitespace, refined section hierarchy, softer cards and consistent rounded surfaces.
- Existing school profile, memories gallery, registration, status, alumni and notice sections remain in place.
- Hover/scroll motion, subtle hero zoom and responsive layout; `prefers-reduced-motion` is respected.

## Main files changed
- `app/HeroSlider.js`
- `app/page.js`
- `app/globals.css`

## Validation
- CSS parsed successfully with PostCSS.
- `next build` could not complete in the current environment because the platform-specific Next.js SWC binary was missing and network access to npm registry was unavailable. Run `npm install` and `npm run build` locally before pushing.


### Gallery update
- Added separate Memories and Reunion galleries with independent public pages and homepage previews.
- Main Admin can upload and delete gallery photos; previous static gallery assets were removed.
- The fourth hero slide is the supplied school gate photo.
- Translucent glass surfaces, a fixed school-building backdrop, the supplied school-gate photo as an additional hero slide, and registration-form entrance/focus effects were added.
