# Reunion 2027 — শুরু করার নির্দেশনা (বাংলা)

## ১) নতুন Supabase project লাগবে কি?
না—আগের Supabase project সচল থাকলে সেটিই ব্যবহার করুন। শুধু নতুন project তৈরি করবেন যদি আগের project delete/paused/unavailable হয় বা তার access/key আর না থাকে। `supabase/schema.sql` ইতিমধ্যে চালানো থাকলে শুধু এই কারণে আবার project বানাবেন না।

## ২) Windows-এ লোকালি চালানো
1. Node.js 20.9 বা তার পরের LTS সংস্করণ ইনস্টল করুন।
2. এই ফোল্ডারেই PowerShell/Terminal খুলুন।
3. `.env.local.example` কপি করে `.env.local` নাম দিন।
4. `.env.local`-এ নিচের মানগুলো পূরণ করুন:
   - `SUPABASE_URL`: Supabase → Project Settings → API → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API → Secret key (`sb_secret_...`) অথবা legacy `service_role` key। Publishable/anon key নয়। এটি শুধু সার্ভার-সাইডে থাকবে।
   - `ADMIN_PASSWORD`: আপনার নিজস্ব শক্তিশালী পাসওয়ার্ড, কমপক্ষে ১৬ অক্ষর।
   - `ADMIN_SECRET`: কমপক্ষে ৩২ অক্ষরের random secret। তৈরি করতে: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `SITE_URL`: লোকাল ব্যবহারে ফাঁকা রাখুন; deploy করার পরে `https://আপনার-ডোমেইন` দিন।
5. `npm install`
6. `npm run dev`
7. ব্রাউজারে `http://localhost:3000` খুলুন। Admin login: `http://localhost:3000/admin/login`।

## ৩) Supabase-এ কী করতে হবে
- আগের project ব্যবহার করুন। Supabase → SQL Editor-এ `supabase/schema.sql` পুরোটা Run করুন (আগে সম্পূর্ণভাবে চালানো থাকলে পুনরায় চালানো বাধ্যতামূলক নয়; schema আপডেট করলে চালান)।
- Storage-এ `photos` bucket private আছে কি না নিশ্চিত করুন।
- Project Settings → API থেকে Project URL ও server Secret/service_role key নিন। কোনো key GitHub, ZIP, screenshot বা chat-এ দেবেন না।
- `SUPABASE_SERVICE_ROLE_KEY` কখনো `NEXT_PUBLIC_` prefix দেবেন না।

## ৪) Android ও Desktop-এ পরীক্ষা
- Desktop: `http://localhost:3000`।
- Android: ফোন ও কম্পিউটার একই Wi-Fi-তে রাখুন; কম্পিউটারের LAN IPv4 address বের করে `http://COMPUTER-IP:3000` খুলুন। Windows Firewall চাইলে Node.js/Private network access Allow করুন।
- Public use / অন্য নেটওয়ার্ক থেকে access-এর জন্য HTTPS hosting প্রয়োজন; local server public website নয়। Vercel deploy guide README-তে আছে।
- 320px wide phone থেকে desktop পর্যন্ত responsive CSS রয়েছে; বাস্তব ফোনে Chrome এবং desktop Chrome/Edge-এ পরীক্ষা করুন। সব device-এ নিখুঁত rendering নিশ্চিত করতে বাস্তব device testing দরকার।

## ৫) Button বা login কাজ না করলে
1. Terminal-এ server বন্ধ করুন: `Ctrl+C`.
2. `.next` build cache মুছুন: PowerShell `Remove-Item -Recurse -Force .next` (না থাকলে error উপেক্ষা করুন)।
3. `npm run dev` আবার চালান; browser hard refresh `Ctrl+Shift+R` দিন।
4. `/admin/login`-এ login করলে error message দেখুন। Supabase configuration ভুল হলে API 503 দেখাবে; `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` এবং schema-এর `consume_rate_limit` RPC পরীক্ষা করুন।
5. Admin login সফল হলে `/admin` → System Check ট্যাবে সব check দেখুন।

## ৬) নিরাপত্তা
`.env.local` ব্যক্তিগত রাখুন। `service_role`/`sb_secret` key browser/client code-এ ব্যবহার করবেন না। Admin password বা secret কাউকে পাঠাবেন না।


## স্বয়ংক্রিয় ইমেইল (নতুন)

নিবন্ধন ফর্মে Email Field চালু থাকলে নিবন্ধনের পর স্বয়ংক্রিয় ইমেইলে Registration Number (REU-xxxx), TrxID এবং ID Card খোলার লিংক যাবে। নিবন্ধন Pending থাকলেও লিংকটি সংরক্ষণ করবেন; অ্যাডমিন অনুমোদন করার পর একই লিংক থেকে ID Card দেখা/প্রিন্ট/PDF হিসেবে সংরক্ষণ করা যাবে। অনুমোদনের পর দ্বিতীয় ইমেইলও যাবে।

1. Google Account-এ 2-Step Verification চালু করুন।
2. Google Account → Security → App passwords থেকে একটি App Password তৈরি করুন।
3. `.env.local` এবং Vercel → Project → Settings → Environment Variables-এ যোগ করুন:
   - `GMAIL_USER` = Gmail ঠিকানা
   - `GMAIL_APP_PASSWORD` = ১৬ অক্ষরের App Password
   - `SITE_URL` = সম্পূর্ণ live website URL, যেমন `https://your-site.vercel.app`
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=465`
4. Vercel-এ Redeploy করুন। `vercel.json`-এ Email Queue retry Cron যুক্ত আছে।
5. Supabase SQL Editor-এ `supabase/schema.sql` আগে চালানো থাকলে আবার চালানোর দরকার নেই; নতুন schema পরিবর্তন থাকলে নির্দেশনা অনুযায়ী চালান।
6. Registration submit এবং Admin approval-এর সময় প্রথম email attempt সঙ্গে সঙ্গে হবে। SMTP ব্যর্থ হলে job queue-তে থাকবে এবং Cron পরে retry করবে।
7. Localhost-এ Cron নিজে থেকে চলে না; local test-এ registration/approval থেকে immediate send হবে। Pending queue retry করতে `/api/cron/email-outbox`-এ `Authorization: Bearer <CRON_SECRET>` header দিয়ে GET request দিন।

Admin → Settings → Registration থেকে Email Field চালু/বন্ধ এবং Required/Optional করা যাবে। Admin → Email History-তে পাঠানোর অবস্থা দেখা যাবে এবং ব্যর্থ ইমেইল আবার পাঠানো যাবে।

**গুরুত্বপূর্ণ:** `.env.local` কখনো ZIP/GitHub-এ দেবেন না। Gmail-এর স্বাভাবিক পাসওয়ার্ড নয়, App Password ব্যবহার করবেন। Gmail/SMTP সার্ভার ইমেইল গ্রহণ করেছে মানেই প্রাপকের Inbox-এ পৌঁছেছে—এ নিশ্চয়তা নয়; Spam/Junk ফোল্ডারও পরীক্ষা করতে বলবেন।


## নতুন Admin System

- Login পেজে Main Admin অথবা Sub Admin নির্বাচন করুন।
- Main Admin: `.env.local` / Vercel Environment Variables-এর `ADMIN_PASSWORD`।
- Main Admin Panel → Sub Admins থেকে সর্বোচ্চ ৫টি Sub Admin তৈরি করুন। Username ও Password দিন; Password database-এ salted hash হিসেবে থাকবে।
- Sub Admin শুধু Registration approve/reject এবং QR Scanner থেকে attendance/gift/food mark করতে পারবে।
- Delete বা unmark করতে Main Admin Password আবার দিতে হবে।
- Delete করা registration Recycle Bin-এ থাকবে। Restore বা Permanent Delete Main Admin করতে পারবে।
- Activity Log-এ Admin-এর নাম, action এবং সময় দেখা যাবে।
- T-shirt Size Field Main Admin Settings থেকে চালু/বন্ধ, required/optional এবং size options পরিবর্তন করা যাবে।


## নতুন Photo Gallery setup (এই ZIP-এর নতুন অংশ)

1. Supabase Dashboard → SQL Editor-এ গিয়ে আপডেট করা `supabase/schema.sql` একবার Run করুন। এটি `gallery_photos` table এবং `gallery-photos` public image bucket তৈরি করবে; registrations বা পুরোনো alumni photos মুছবে না।
2. Main Admin হিসেবে `/admin`-এ লগইন করুন। Admin Panel-এর **Photo Gallery** tab থেকে `Memories Gallery` বা `Reunion Photo Gallery` নির্বাচন করে ছবি upload/delete করুন। Gallery management শুধু Main Admin-এর জন্য; Sub Admin-এর existing permissions অপরিবর্তিত।
3. Public site-এ `/memories` ও `/reunion-gallery` আলাদা page, এবং homepage-এ দুটির preview দেখা যাবে।
4. আগের bundled static Memories gallery images আর ব্যবহার করা হচ্ছে না। নতুন gallery-তে কোনো default/placeholder ছবি থাকবে না; Admin upload না করা পর্যন্ত empty state দেখাবে। আগের ZIP-এর bundled static Memories gallery-র ৭টি ছবি সরানো হয়েছে; Supabase-এর registrations বা alumni-photo bucket স্পর্শ করা হয়নি।
5. Gallery upload-এর allowed formats JPG, PNG ও WebP; সর্বোচ্চ file size 8 MB।

**নিরাপত্তা:** `.env.local` কখনো GitHub বা ZIP-এ upload করবেন না। নতুন ZIP extract করার পর নিজের private `.env.local` আলাদা করে copy করুন।

### Vercel Cron সম্পর্কে গুরুত্বপূর্ণ
`vercel.json`-এর schedule প্রতিদিন 03:00 UTC (বাংলাদেশ সময় সকাল 09:00) চালু হয়। Vercel Hobby/Free plan-এ Cron দিনে একবারের বেশি চালানো যায় না; Pro plan-এ চাইলে schedule `*/5 * * * *` করা যায়। Registration ও approval-এর প্রথম email attempt cron-এর অপেক্ষা করে না—সঙ্গে সঙ্গে হয়; Cron শুধু ব্যর্থ/অপেক্ষমাণ job retry করে। Cron কেবল Production deployment-এ চলে।
