# Reunion 2027 — Photo & Design Update

- Hero slider now uses three real school photos supplied by the user (school building, school gathering, morning assembly).
- Added a responsive seven-photo memories gallery with keyboard-enabled lightbox (Escape/Left/Right).
- Added restrained Ken Burns hero motion, polished slide dots, hover zoom, reveal styling, and reduced-motion support.
- User-supplied photos were optimized to WebP for the gallery.
- Existing registration, Supabase, admin, alumni, QR check-in, and other app logic were not intentionally changed.
- No unrelated school photos were copied from third-party sources; the supplied school photos are sufficient and avoid misrepresenting another school as Ganganandapur.
- Added the 2024 school profile figures (911 students, 25 teachers, 7 staff) as dated information and identified Sohopathi as the source in the UI.
- Replaced the previous generated school-gate background and social preview with the real school-building photo supplied by the user.
- Validation: all 68 project JavaScript files parsed and the CSS parsed successfully. A full Next.js build could not run in this offline environment because the Linux SWC binary was not present in the supplied Windows `node_modules` archive.
- On your computer, run `npm install` then `npm run build` before pushing to GitHub.
