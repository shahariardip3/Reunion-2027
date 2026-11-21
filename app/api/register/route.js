import crypto from "crypto";
import { db } from "../../../lib/supabase";
import { csrfGuard, rateLimit, validImageSignature } from "../../../lib/security";
import { fail, json, dbFail, isMissingColumn } from "../../../lib/http";
import { normalizeDigits, normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../../../lib/format";
import { paymentMethods } from "../../../lib/settings";

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
  const trx = normalizeTrx(text(fd.get("trx_id")));
  const method = text(fd.get("pay_method")) || "bkash";
  const photo = fd.get("photo");

  if (name.length < 3 || name.length > 80 || /[<>\u0000-\u001f]/.test(name)) return fail("Name must be 3–80 valid characters.");
  if (!/^\d{4}$/.test(batch) || +batch < 1940 || +batch > new Date().getFullYear()) return fail("SSC batch must be a 4-digit year.");
  if (!PHONE_RE.test(phone)) return fail("Enter a valid Bangladesh mobile number.");
  if (profession.length < 2 || profession.length > 100 || /[<>\u0000-\u001f]/.test(profession)) return fail("Enter a valid present profession.");
  if (!TRX_RE.test(trx)) return fail("Enter a valid transaction ID.");
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
  const methods = paymentMethods(st || {});
  if (!methods.length) return fail("Payment information has not been set up yet.", 503);
  if (!methods.some((m) => m.id === method)) return fail("Invalid payment method.");

  const { data: dup, error: dupError } = await sb.from("registrations").select("id").eq("trx_id", trx).maybeSingle();
  if (dupError) return dbFail("register:lookup", "Could not validate transaction ID. Try again.", dupError, { status: 503 });
  if (dup) return fail("This transaction ID has already been used.", 409);

  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from("photos").upload(path, bytes, { contentType: photo.type, upsert: false });
  if (up.error) return dbFail("register:upload", "Photo upload failed. Try again.", up.error);

  const row = { full_name: name, ssc_batch: batch, phone, profession, photo_path: path, trx_id: trx, pay_method: method };
  let { error } = await sb.from("registrations").insert(row);
  if (isMissingColumn(error)) {            // database not upgraded yet: still accept the registration
    const { pay_method, ...legacy } = row;
    ({ error } = await sb.from("registrations").insert(legacy));
  }
  if (error) {
    await sb.storage.from("photos").remove([path]);
    if (error.code === "23505") return fail("This transaction ID has already been used.", 409);
    return dbFail("register:insert", "Registration could not be saved.", error);
  }
  return json({ ok: true });
}
