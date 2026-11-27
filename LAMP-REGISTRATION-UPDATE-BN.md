# Reunion 2027 — Animated Lamp Registration Update

এই আপডেটে V8-এর Registration page-এ interactive pull-cord lamp intro যোগ করা হয়েছে।

## কীভাবে কাজ করে
- Registration page খুললে lamp panel dark অবস্থায় থাকবে এবং registration form hidden/inert থাকবে।
- SVG cord-এ tap/click অথবা drag করে নিচে টানলে lamp জ্বলে উঠবে।
- Cord release হলে ছোট spring/bounce animation হবে।
- Warm yellow cone beam, lamp glow এবং registration form reveal হবে।
- চাইলে `লাইট অন করুন / Turn light on` বোতাম দিয়েও lamp চালু করা যায়; keyboard ও touch ব্যবহারকারীরাও form খুলতে পারবেন।
- Light off করলে form আবার hide/inert হবে; form-এর typed draft আগের মতো sessionStorage-এ থাকে।
- Mobile layout এবং `prefers-reduced-motion` preference সমর্থিত।

## পরিবর্তিত ফাইল
- `app/register/RegisterForm.js` — LampReveal UI, SVG lamp, pull interaction ও form reveal wrapper।
- `app/globals.css` — lamp scene, beam, warm glow, responsive ও reduced-motion styles।

## গুরুত্বপূর্ণ
- Registration API, database schema, validation, payment flow, photo compression, TrxID checks বা admin features পরিবর্তন করা হয়নি।
- নতুন কোনো animation dependency যোগ করা হয়নি; SVG/CSS/React ব্যবহার করা হয়েছে।
- Unit tests: `npm run test:unit` — 3/3 passed.
- এই রানটাইমে `npm ci` সম্পূর্ণ হয়নি, তাই Next.js production build চালানো যায়নি। নিজের পরিবেশে `npm ci` সফল হলে `npm run build` দিয়ে production build যাচাই করুন।

## V8.1 visual correction (same-position reveal + green palette)
- লাইট জ্বালালে Registration Form আর ল্যাম্পের নিচে/পরের সেকশনে আসে না। Desktop-এ একই registration card-এর ডান পাশে form দেখা যায়; বাম পাশে illuminated lamp panel থাকে।
- Mobile-এ একই জায়গায় lamp intro crossfade করে form পুরো জায়গা নেয়—অতিরিক্ত lamp section-এর নিচে form জমা হয় না।
- Warm yellow/orange theme বদলে Reunion website-এর forest-green, emerald ও soft mint palette ব্যবহার করা হয়েছে; lamp glow-ও green-tinted।
- Existing form fields, validation, payment flow, photo upload ও API অপরিবর্তিত।

## V8.2 — Status page lamp
- একই animated pull-cord lamp `/status` পেজের status lookup form-এও যোগ করা হয়েছে।
- আলো জ্বালালে Transaction ID ও registered phone form একই lamp card-এর reveal area-তে দেখা যায়; status result-ও ওই একই area-তে দেখায়।
- বাংলা/ইংরেজি নির্দেশনা, accessible light toggle এবং reduced-motion support রাখা হয়েছে।
- `/register`-এর আগের green lamp reveal এবং registration/payment flow অপরিবর্তিত।
