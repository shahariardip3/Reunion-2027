# V8.4 — Email History & Queue Visibility Fix

## কী সমস্যা ছিল
Admin → Email History শুধু `email_logs` টেবিল পড়ত। Registration/approval-এর সময় ইমেইল প্রথমে `email_outbox`-এ queued হয়; Cron worker না চলা পর্যন্ত `email_logs`-এ কোনো attempt তৈরি হয় না। ফলে ইমেইল queued থাকলেও History-তে “No email records yet” দেখা যেত।

## কী পরিবর্তন হয়েছে
- Email History এখন `email_logs`-এর sent/failed/sending attempt এবং `email_outbox`-এর queued/processing/failed job একসাথে দেখায়।
- Queue-তে থাকা ইমেইলের recipient, attempt count, next attempt time ও last error দেখায়।
- Failed/queued outbox job Admin থেকে আবার queue করা যায়।
- Existing SMTP sending, registration flow, approval flow ও database schema অপরিবর্তিত।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
এই source code-এ SMS gateway integration নেই। `sms`, SMS provider URL/API, SMS send function বা SMS outbox implementation পাওয়া যায়নি। Gmail SMTP settings ঠিক থাকলেও SMS যাবে না। SMS যোগ করতে ব্যবহৃত gateway-এর নাম ও API documentation/credentials variable names প্রয়োজন; secret key কখনো ZIP বা chat-এ পাঠাবেন না।

## Deploy
এই update-এর জন্য নতুন database migration প্রয়োজন নেই। ZIP deploy করার পর Admin → Email History refresh করুন। Queue worker চালু না থাকলে queued status দেখা যাবে; cron endpoint-টি scheduler থেকে `Authorization: Bearer <CRON_SECRET>` header দিয়ে call করতে হবে।
