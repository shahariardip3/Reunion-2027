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
