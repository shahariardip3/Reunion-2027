# Reunion website — security and setup notes

## Before running the upgraded app

1. Install Node.js 20.9+ (Node.js 22.12+ is recommended for this setup). The project uses Next.js 16.4.6, the current stable Active LTS release.
2. Copy `.env.local.example` to `.env.local`.
3. Set `SUPABASE_URL` and the **server-only** `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key in a `NEXT_PUBLIC_...` variable or browser code.
4. Set `ADMIN_PASSWORD` to a unique password of at least 16 characters.
5. Set `ADMIN_SECRET` to a random secret of at least 32 characters. Generate one with:
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
6. In Supabase SQL Editor:
   - For a brand-new database, run `supabase/schema.sql`.
   - Run `supabase/schema.sql` (safe to re-run; it also grants the server key access to the tables).
7. Run `npm install`, then `npm run build`, then `npm start`.
8. Deploy behind HTTPS. After changing the environment variables, restart/redeploy the application.

## Protections added in application code

- SQL injection: Supabase query builder with bound values; no user input is interpolated into raw SQL.
- XSS: React's normal escaped rendering; input length/character checks; restrictive Content Security Policy. Do not add `dangerouslySetInnerHTML`.
- CSRF: same-origin checks on all state-changing API routes; SameSite=Strict admin cookie.
- IDOR / broken access control: status lookup requires both transaction ID and registered phone; admin APIs independently verify a signed admin session; photos use short-lived signed URLs from a private bucket.
- DDoS / brute force: database-backed per-IP rate limits on registration, status lookup, admin login and admin writes; request size limits for registration.
- Session hijacking: HttpOnly, Secure in production, SameSite=Strict cookie; signed, expiring, random session token; eight-hour lifetime.
- File upload: size and MIME allowlist plus JPEG/PNG/WebP magic-byte validation; random storage object names; private storage bucket.
- Clickjacking: `frame-ancestors 'none'` and `X-Frame-Options: DENY`.
- Security headers: CSP, HSTS, nosniff, referrer policy, permissions policy, COOP/CORP; `X-Powered-By` disabled.
- Bilingual interface: Bangla and English switcher; separate Bengali and English event title, description, venue and payment instructions in Admin settings.

## Risks that need hosting / operational controls

Some listed attack classes are not present as vulnerable features in this code:
- SSRF: no user-controlled server-side URL fetch.
- XXE: no XML parser or XML upload feature.
- Command injection: no shell/OS command execution.
- Directory traversal: no user-controlled filesystem path handling.
- Phishing: cannot be prevented by application code alone; use a trusted domain, HTTPS, clear official contact details, and email-domain protections (SPF, DKIM, DMARC) if sending email.

DDoS protection at scale cannot be guaranteed by app-level rate limiting. Enable Cloudflare (or your host's WAF/DDoS protection), set hosting request/body limits, monitor logs, and configure database backups. Add admin MFA or a second authentication factor before production if possible.

## Important data/privacy note

When the admin enables the public Alumni page, approved alumni names and photos are visible to visitors. Obtain consent before enabling it. Phone numbers and transaction IDs are not included in that public list.


## Notice board upgrade
After applying the existing schema/security migrations, run `supabase/notices_migration.sql` once in the Supabase SQL Editor. The public `/notice` page only displays published, non-expired notices. Admins can create bilingual notices, save drafts, pin important notices, set expiry dates, edit, and delete them from `/admin`.

The footer credits Al Shahariar Dip (SSC Batch 2021, currently KUET ECE). School display name is corrected to “গঙ্গানন্দপুর মাধ্যমিক বিদ্যালয়”.


## v2 notes (Reunion 2027 final)
- **Fonts / CSP:** the Content-Security-Policy now allows Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) so the Bangla font (Hind Siliguri) really loads. Nothing else was relaxed.
- **Camera:** `Permissions-Policy` now allows the camera for the site's own origin only (needed for the admin QR scanner).
- **Privacy:** private phone numbers and storage paths are never sent to the browser by the public Alumni page. The QR token is returned by the status API only for approved registrations.
- **Input normalisation:** Bangla digits (০-৯) and `+880…` phone formats are accepted and normalised on both client and server.
- **Database setup:** `supabase/schema.sql` is idempotent. Re-run it after upgrading the site; the admin “System check” tab verifies tables, columns, permissions, the private bucket and the rate-limit function.


## Main Admin / Sub Admin, audit and Recycle Bin

- Main Admin password remains in the server-only `ADMIN_PASSWORD` environment variable.
- Sub Admins are created from the Main Admin panel. Passwords are stored as salted scrypt hashes, never as plaintext.
- Sub Admin sessions are checked against the database so deleting an account invalidates its next request.
- Sub Admins can approve/reject registrations and use the QR scanner to mark attendance, gift and food.
- Delete and unmark requests require the Main Admin password again. The password is sent only with that action and is not stored in the browser session.
- Registration deletion moves the full record to `registration_trash`; the photo stays in storage until Main Admin permanently deletes it.
- `activity_logs` is written server-side and there is no edit/delete control in the Admin UI.

Run the updated `supabase/schema.sql` before using these features. Keep `ADMIN_PASSWORD` and `ADMIN_SECRET` in Vercel Environment Variables and never commit `.env.local`.

## Automatic Gmail email

Set `GMAIL_USER`, `GMAIL_APP_PASSWORD`, and `SITE_URL` in `.env.local` and Vercel. Gmail App Password requires Google 2-Step Verification. Use the App Password, not the normal account password. Registration emails include the assigned Registration Number, TrxID, and an ID-card link. The link opens the card after approval; an approval email is also sent. Admin → Email History shows attempts and allows retrying failed emails.

The application logs whether SMTP accepted the message. SMTP acceptance does not guarantee inbox delivery; recipients should also check Spam/Junk. Gmail sending limits and account restrictions are controlled by Google.
