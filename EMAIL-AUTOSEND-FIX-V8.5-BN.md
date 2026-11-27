# Reunion 2027 V8.5 — Email Auto-Send Fix

## কী ঠিক করা হয়েছে
- Registration সফলভাবে save হওয়ার পর email queue তৈরি করে একই request-এ প্রথম send attempt করা হয়।
- Admin approval-এর পর approval email-ও সঙ্গে সঙ্গে পাঠানোর চেষ্টা হয়।
- SMTP ব্যর্থ হলে registration/approval ব্যর্থ হয় না; email queue-তে retry-এর জন্য থাকে।
- Immediate sender ও Cron worker একই atomic claim function ব্যবহার করে, ফলে একই queued job দুই worker একসঙ্গে পাঠানোর ঝুঁকি কমে।
- Vercel production-এর জন্য `vercel.json` Cron যোগ করা হয়েছে।
- Email retry করলে পুরোনো failed history row-কে মিথ্যা করে sent দেখায় না; নতুন attempt-এর আলাদা history row তৈরি হয়।

## প্রয়োজনীয় Environment Variables
`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SITE_URL`, `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`। `.env.local` ZIP/GitHub-এ দেবেন না। একই secret Vercel Project Settings → Environment Variables-এ আলাদাভাবে যোগ করে redeploy করুন।

## Schedule
Vercel Hobby/Free-এ Cron দিনে একবার: `0 3 * * *` (বাংলাদেশ সময় 09:00)। Pro plan-এ বেশি ঘন ঘন retry দরকার হলে `vercel.json`-এ `*/5 * * * *` করা যায়। Cron শুধু Production deployment-এ চলে।

## Localhost
Localhost-এ registration/approval-এর সময় immediate send attempt হবে। Cron স্বয়ংক্রিয়ভাবে চালু হয় না; pending queue retry করতে `Authorization: Bearer <CRON_SECRET>` header দিয়ে `GET /api/cron/email-outbox` call করুন।

## SMS
এই release-এ SMS gateway integration যোগ করা হয়নি, কারণ project ZIP-এ SMS provider-এর নাম/API endpoint ও `.env.local`-এর variable names নেই। SMS credentials ZIP-এ রাখা নিরাপদও নয়। Gateway provider ও variable names নিশ্চিত হলে SMS queue/history/worker-কে একই pattern-এ যুক্ত করতে হবে।
