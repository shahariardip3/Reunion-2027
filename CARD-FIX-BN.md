# ID Card / Status কেন কাজ করছিল না — কারণ ও সমাধান

**কারণ:** কোড (`/api/status`, ইমেইলের কার্ড লিংক, `/card` পেজ) `registrations.card_token` কলাম ব্যবহার করে, কিন্তু `supabase/schema.sql`-এ এই কলামটাই ছিল না। ফলে Supabase "column does not exist" error দেয়, Status পেজ "Could not check status" দেখায়, কার্ড কখনো তৈরি হয় না, আর অনুমোদনের ইমেইলে কার্ড লিংকও যায় না।

**সমাধান (একবারই করতে হবে):**
1. Supabase → SQL Editor-এ `supabase/fix-card-token.sql` ফাইলের লেখা চালান (বারবার চালালেও ক্ষতি নেই)।
2. পুরোনো সব রেজিস্ট্রেশন নিজে নিজে আলাদা card token পেয়ে যাবে।
3. অ্যাডমিন → Diagnostics-এ `registrations` টেবিলে এখন `card_token` পরীক্ষা হয়, সবুজ দেখাবে।
4. পরীক্ষা: একটা অনুমোদিত রেজিস্ট্রেশনের TrxID + ফোন দিয়ে Status পেজে দেখুন, তারপর "ID Card" বাটনে চাপুন।

**ইমেইলে কার্ড লিংক যেতে চাইলে** `.env.local` / Vercel-এ `SITE_URL=https://আপনার-ডোমেইন` সেট থাকতে হবে, আর ইমেইল কিউ চালাতে `CRON_SECRET` ও scheduler লাগবে (`V8-ALL-UPGRADES-BN.md` দেখুন)।

**মনে রাখবেন:** v8 থেকে রেজিস্ট্রেশন নম্বর (REU-xxxx) ও কার্ড অনুমোদনের পরেই তৈরি হয়। জমা দেওয়ার সাথে সাথে কার্ড পাওয়া যায় না, অ্যাডমিন approve করার পর পাওয়া যায়।
