# Reunion 2027 — V8 Unified Upgrade (V8–V11 improvements bundled)

এই সংস্করণে আগের v8 Reliability & Security, v9 Event Operations, v10 Gallery Management এবং v11 Testing/Launch Quality roadmap একত্রে v8-এ আনা হয়েছে। v7-এর বিদ্যমান Next.js/Supabase structure ও visual design ধরে additive পরিবর্তন করা হয়েছে।

## অন্তর্ভুক্ত উন্নতি

### Security / reliability
- Signed admin cookie-এর পাশাপাশি `admin_sessions` server registry; logout ও Main Admin-এর remote session revoke কার্যকর। Main Admin password বা Sub Admin password hash বদলালে আগের session স্বয়ংক্রিয়ভাবে invalid হয়।
- Rate-limit cleanup RPC; active block শেষ হওয়ার আগে record মুছে না।
- Registration approval RPC row-lock + idempotent; registration number এখন approval-এর সময় তৈরি হয়।
- Gallery browser image সবসময় canvas দিয়ে re-encode হয়; EXIF/GPS metadata original ফাইল থেকে carry-forward হয় না।
- Email outbox queue; registration/approval response SMTP-এর জন্য অপেক্ষা করে না। Retry backoff এবং সর্বোচ্চ ৫ attempt আছে।
- Email outbox endpoint `CRON_SECRET` দিয়ে সুরক্ষিত।

### Event operations / finance
- Registration-এ বর্তমান fee snapshot `fee_amount` রাখা হয়; পুরোনো registration-এর fee null থাকে (পুরোনো fee অনুমান করা হয়নি)।
- `payment_status`, `payment_verified_at`, `payment_verified_by` এবং admin verification action।
- Admin dashboard verified payment amount দেখায়।
- Registration admin-এ payment verified/unverified filter এবং individual verification।
- Main Admin-এর জন্য সর্বোচ্চ ৫০টি selected record bulk approve/reject/payment verify/mismatch API/UI এবং সর্বোচ্চ ৫০০টি selected record CSV export।
- Bulk approval-এ approval email outbox-এ queue হয়।

### Gallery management
- বাংলা/English caption edit, pin/unpin, manual sort order (Move up) এবং multiple file selection/bulk sequential upload।
- Gallery public ordering: pinned, sort order, then newest.

### Launch quality
- Admin diagnostics-এ v8 table/column probes।
- Reduced-motion accessibility CSS.
- `V8-TEST-AND-LAUNCH.md`-এ migration, scheduler, test checklist ও backup/restore নির্দেশনা; `npm run test:unit` regression tests।

## Upgrade করার আগে
1. Supabase database backup নিন।
2. Project files-এর আলাদা copy রাখুন।
3. `.env.local`-এ `CRON_SECRET` যোগ করুন।
4. Supabase SQL Editor-এ সম্পূর্ণ `supabase/schema.sql` একবার চালান। এটি additive migration হিসেবে লেখা; existing records drop করে না।
5. Deploy/build করুন এবং `npm run build` সফল কিনা দেখুন।
6. Admin login নতুন session registry-তে session তৈরি করবে; migration-এর আগে থাকা cookie/session আবার login করতে হবে।

## Email queue চালু করা
প্রতি মিনিটে scheduler/cron থেকে GET request:
`https://YOUR_DOMAIN/api/cron/email-outbox`
Header: `Authorization: Bearer YOUR_CRON_SECRET`

এটি ১০টি পর্যন্ত due email process করে। Vercel হলে Cron Job configure করা যায়; অন্য hosting হলে hosting provider-এর scheduler ব্যবহার করুন। Endpoint public request-এর জন্য নয়।

## Rate-limit cleanup
প্রতিদিন scheduler থেকে service-role authenticated database job/SQL চালান:
`select public.cleanup_expired_rate_limits(5000);`
শুধু expired window এবং expired block থাকা record মুছে।

## গুরুত্বপূর্ণ আচরণ পরিবর্তন
- Registration submit করলে pending record তৈরি হয়; registration number approval-এর পর তৈরি হবে। User-কে TrxID ও registered phone দিয়ে Status page ব্যবহার করতে হবে।
- Pending confirmation email-এ ID card link থাকবে না; approval email-এ ID card link থাকবে।
- Fee snapshot নতুন registration থেকে capture হবে। আগের registration-এর historical fee database-এ ছিল না, তাই null রাখা হয়েছে।
- Email queue চালাতে scheduler configure না করলে email queued অবস্থায় থাকবে; website registration save হবে, কিন্তু email delivery হবে না।
- Canvas metadata stripping browser upload path-এ প্রযোজ্য। Existing gallery images স্বয়ংক্রিয়ভাবে rewrite করা হয়নি।

## Production cautions
- `ADMIN_SECRET`, `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, Gmail app password এবং `CRON_SECRET` কখনো repository/ZIP-এ বসাবেন না।
- Session list সর্বশেষ ১০০টি record দেখায়; expired/revoked session cleanup migration script-এর অংশ নয়, কারণ audit history রাখা হয়।
- এই ZIP-এর code staticভাবে পরীক্ষা করা হয়েছে; live Supabase, SMTP, deployment cron এবং real-device flow আপনার environment-এ পরীক্ষা করতে হবে।
