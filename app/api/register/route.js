import crypto from "crypto";
import { after } from "next/server";
import { db } from "../../../lib/supabase";
import { csrfGuard, rateLimit, validImageSignature } from "../../../lib/security";
import { fail, json, dbFail } from "../../../lib/http";
import { normalizeDigits, normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../../../lib/format";
import { paymentMethods } from "../../../lib/settings";
import { processEmailOutboxJob } from "../../../lib/email";
import { insertCompat, uploadCompat } from "../../../lib/db-compat";

export const runtime = "nodejs";
const MAX = 220 * 1024;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const text = (v) => String(v || "").normalize("NFC").trim();

export async function POST(req) {
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "register", 8, 3600); if (limited) return limited;
  if (Number(req.headers.get("content-length") || 0) > MAX + 30_000) return fail("Request too large.", 413);

  let fd;
  try { fd = await req.formData(); } catch { return fail("Invalid form data."); }

  const name = text(fd.get("full_name")).replace(/\s+/g, " ");
  const batch = normalizeDigits(text(fd.get("ssc_batch")));
  const phone = normalizePhone(text(fd.get("phone")));
  const profession = text(fd.get("profession"));
  const email = text(fd.get("email")).toLowerCase();
  const tshirtSize = text(fd.get("tshirt_size")).toUpperCase();
  const trx = normalizeTrx(text(fd.get("trx_id")));
  const method = text(fd.get("pay_method")) || "bkash";
  const photo = fd.get("photo");

  if (name.length < 3 || name.length > 80 || /[<>\u0000-\u001f]/.test(name)) return fail("Name must be 3–80 valid characters.");
  if (!/^\d{4}$/.test(batch) || +batch < 1940 || +batch > new Date().getFullYear()) return fail("SSC batch must be a 4-digit year.");
  if (!PHONE_RE.test(phone)) return fail("Enter a valid Bangladesh mobile number.");
  if (profession.length < 2 || profession.length > 100 || /[<>\u0000-\u001f]/.test(profession)) return fail("Enter a valid present profession.");
  if (!TRX_RE.test(trx)) return fail("Enter a valid transaction ID.");
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return fail("Enter a valid email address.");
  if (!photo || typeof photo === "string") return fail("Photo is required.");
  if (photo.size < 16 || photo.size > MAX) return fail("Photo must be under 220 KB.");
  const ext = EXT[photo.type];
  if (!ext) return fail("Only JPG, PNG or WebP photos are allowed.");
  const bytes = Buffer.from(await photo.arrayBuffer());
  if (!validImageSignature(bytes, photo.type)) return fail("The uploaded file is not a valid image.");

  const sb = db();
  const { data: st, error: stError } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  if (stError) return dbFail("register:settings", "Could not read settings.", stError, { status: 503 });
  if (st && st.registration_open === false) return fail("Registration is closed.", 403);
  const emailEnabled = st?.email_field_enabled !== false;
  const emailRequired = st?.email_field_required !== false;
  if (emailEnabled && emailRequired && !email) return fail("Email address is required.");
  if (!emailEnabled && email) return fail("Email field is currently disabled.");
  const tshirtEnabled = st?.tshirt_field_enabled === true;
  const tshirtRequired = st?.tshirt_field_required === true;
  const tshirtSizes = Array.isArray(st?.tshirt_sizes) && st.tshirt_sizes.length ? st.tshirt_sizes : ["S","M","L","XL","XXL","XXXL"];
  if (tshirtEnabled && tshirtRequired && !tshirtSize) return fail("T-shirt size is required.");
  if (tshirtEnabled && tshirtSize && !tshirtSizes.includes(tshirtSize)) return fail("Invalid T-shirt size.");
  if (!tshirtEnabled && tshirtSize) return fail("T-shirt size field is currently disabled.");
  const methods = paymentMethods(st || {});
  if (!methods.length) return fail("Payment information has not been set up yet.", 503);
  if (!methods.some((m) => m.id === method)) return fail("Invalid payment method.");

  const { data: dup, error: dupError } = await sb.from("registrations").select("id").eq("trx_id", trx).maybeSingle();
  if (dupError) return dbFail("register:lookup", "Could not validate transaction ID. Try again.", dupError, { status: 503 });
  if (dup) return fail("This transaction ID has already been used.", 409);

  // Same person registering twice (same phone number AND same name) is almost always a mistake.
  // Different people may share a phone (family), so a phone match alone is allowed.
  const { data: samePhone, error: phoneError } = await sb.from("registrations").select("full_name").eq("phone", phone).limit(20);
  if (phoneError) return dbFail("register:phone-lookup", "Could not validate your details. Try again.", phoneError, { status: 503 });
  const key = (v) => String(v || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  if ((samePhone || []).some((r) => key(r.full_name) === key(name))) {
    return fail("This name and phone number are already registered. Use the Status page with your TrxID and phone number to check it.", 409);
  }


  // Same e-mail address + same name is the same person registering again (a family may share an address, so the name must match too).
  if (email) {
    const { data: sameEmail, error: emailLookupError } = await sb.from("registrations").select("full_name").eq("email", email).limit(20);
    if (emailLookupError) return dbFail("register:email-lookup", "Could not validate your details. Try again.", emailLookupError, { status: 503 });
    if ((sameEmail || []).some((r) => key(r.full_name) === key(name))) {
      return fail("This name and phone number are already registered. Use the Status page with your TrxID and phone number to check it.", 409);
    }
  }

  const photoPath = `${crypto.randomUUID()}.${ext}`;
  const up = await uploadCompat(sb, "photos", photoPath, bytes, { contentType: photo.type, upsert: false }, { public: false, fileSizeLimit: 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (up.error) return dbFail("register:upload", "Photo upload failed. Try again.", up.error);

  const row = {
    full_name: name, ssc_batch: batch, phone, email: emailEnabled ? (email || null) : null,
    tshirt_size: tshirtEnabled ? (tshirtSize || null) : null,
    profession, photo_path: photoPath, trx_id: trx, pay_method: method, reg_code: null,
    fee_amount: Number(st?.amount || 0),
  };
  // fee_amount is optional: an older database without that column still accepts the registration.
  const { data: inserted, error } = await insertCompat(sb, "registrations", row, ["fee_amount"], "*");
  if (error) {
    await sb.storage.from("photos").remove([photoPath]);
    if (error.code === "23505") return fail("This transaction ID or registration number has already been used.", 409);
    return dbFail("register:insert", "Registration could not be saved. Run the latest supabase/schema.sql.", error);
  }

  let emailQueued = false, emailSent = false, emailError = null;
  if (email) {
    const { data: queuedJob, error: queueError } = await sb.from("email_outbox")
      .upsert({ registration_id: inserted.id, email_type: "registered", status: "queued", available_at: new Date().toISOString() },
        { onConflict: "registration_id,email_type", ignoreDuplicates: true })
      .select("id").maybeSingle();
    if (queueError) console.error("[register:email-queue]", queueError.message);
    else {
      emailQueued = true;
      // Send AFTER the response: a slow SMTP server must never keep the visitor waiting on the form.
      // If it fails, the job stays in email_outbox and the cron / admin "retry" picks it up.
      if (queuedJob?.id) {
        const jobId = queuedJob.id;
        after(async () => {
          try { await processEmailOutboxJob(jobId); }
          catch (e) { console.error("[register:email-after]", e?.message || e); }
        });
      }
    }
  }
  return json({ ok: true, registration_id: inserted.id, status: "pending", email_sent: emailSent, email_queued: emailQueued, email_error: emailError, email_skipped: !email });
}
