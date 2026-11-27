# V8 test & launch checklist

## Database and secrets
- [ ] Take a Supabase backup before migration.
- [ ] Run `supabase/schema.sql` in Supabase SQL Editor.
- [ ] Confirm `admin_sessions`, `email_outbox`, payment columns, and gallery ordering columns exist.
- [ ] Add a unique random `CRON_SECRET` to hosting environment variables.
- [ ] Keep Supabase service-role key server-side only.

## Automated/local checks
- [ ] `npm ci`
- [ ] `npm run test:unit` (small input-normalisation regression suite)
- [ ] `npm run build`
- [ ] Review Next.js build output for missing env or route errors.

## Registration workflow
- [ ] Submit valid registration with a unique TrxID.
- [ ] Confirm record is `pending`, has no `reg_code`, and stores `fee_amount` snapshot.
- [ ] Confirm duplicate TrxID is rejected.
- [ ] Check status using TrxID + registered phone.
- [ ] Approve once; confirm exactly one `REU-####` code is assigned.
- [ ] Approve again; confirm the same code is returned.
- [ ] Confirm approval email is queued once, not sent synchronously.

## Email worker
- [ ] Request `/api/cron/email-outbox` without auth; expect 401.
- [ ] Request with correct `Authorization: Bearer CRON_SECRET`; expect processed/sent/failed counts.
- [ ] Configure hosting scheduler to call the endpoint every minute.
- [ ] Force a test SMTP failure and confirm retry/backoff, then terminal failed after five attempts.

## Admin/security
- [ ] Login as Main Admin; confirm session row is created.
- [ ] Logout; confirm current session is revoked and cookie cleared.
- [ ] Login from two browsers; revoke one session from Sessions tab; confirm it is rejected on next request.
- [ ] Confirm Sub Admin cannot open session management or verify payments.
- [ ] Confirm CSRF checks remain active for write requests.

## Payments / operations
- [ ] Verify payment on a test registration; confirm verifier and timestamp.
- [ ] Confirm verified amount uses `fee_amount`, not today's settings fee.
- [ ] Test payment verified/unverified filters.
- [ ] Bulk select no more than 50 registrations; test approve/reject/verify/mismatch.
- [ ] Export selected records to CSV (up to 500 selected).
- [ ] Export registrations and check CSV contents.

## Gallery
- [ ] Upload a small JPEG that contains EXIF GPS metadata; verify browser canvas re-encoding and check output metadata with an EXIF inspection tool.
- [ ] Upload multiple files; confirm each successful upload appears.
- [ ] Edit both captions, pin/unpin, and move a photo up.
- [ ] Delete a test photo; confirm full-size and thumbnail storage cleanup.
- [ ] Check Memories and Reunion public galleries on mobile and desktop.

## Backup / restore
- Use Supabase Dashboard database backups/PITR where available before schema or production changes.
- Keep a copy of the deployed ZIP/source and `.env.local` separately in a secure password manager (do not put secrets inside ZIP).
- For restore, restore the database from the selected Supabase backup, redeploy the matching source revision, then verify admin login, registration status and storage objects.
- Database backup does not necessarily include Supabase Storage object bytes. Keep a separate secure export/backup of `photos` and `gallery-photos` buckets if the event images are irreplaceable.
