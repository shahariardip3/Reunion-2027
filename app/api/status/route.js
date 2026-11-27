import { NextResponse } from "next/server";
import { db } from "../../../lib/supabase";
import { csrfGuard, rateLimit } from "../../../lib/security";
import { UUID_RE } from "../../../lib/http";
import { normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../../../lib/format";

const FIELDS = "full_name,ssc_batch,profession,status,reg_code,photo_path,checkin_token,card_token,attended_at";

export async function POST(req) {
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "status-check", 10, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));

  // Two ways to look a registration up:
  //  1) card_token  – the long random token from the e-mailed ID-card link (nothing guessable, no TrxID in the URL)
  //  2) TrxID + (phone | reg code) – the manual Status page
  const cardToken = typeof body.card_token === "string" ? body.card_token.trim().toLowerCase() : "";
  let query;
  if (cardToken) {
    if (!UUID_RE.test(cardToken)) return NextResponse.json({ error: "Invalid card link." }, { status: 400 });
    query = db().from("registrations").select(FIELDS).eq("card_token", cardToken);
  } else {
    const trx = normalizeTrx(typeof body.trx === "string" ? body.trx : "");
    const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
    const regCode = typeof body.reg_code === "string" ? body.reg_code.trim().toUpperCase() : "";
    const validReg = /^REU-\d{4,}$/.test(regCode);
    if (!TRX_RE.test(trx) || (!PHONE_RE.test(phone) && !validReg))
      return NextResponse.json({ error: "Transaction ID and registration number (or registered phone number) are required." }, { status: 400 });
    // Per-TrxID cap regardless of IP: guessing the phone/reg code for one TrxID from many IPs is stopped here.
    const perTrx = await rateLimit(req, "status-trx", 15, 3600, { subject: trx, perIp: false }); if (perTrx) return perTrx;
    query = db().from("registrations").select(FIELDS).eq("trx_id", trx);
    query = validReg ? query.eq("reg_code", regCode) : query.eq("phone", phone);
  }

  const sb = db();
  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: "Could not check status. Try again." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "No registration found with those details." }, { status: 404 });
  const out = { full_name: data.full_name, ssc_batch: data.ssc_batch, profession: data.profession || "", status: data.status, reg_code: data.reg_code, attended_at: data.attended_at };
  if (data.status === "approved") {
    // The QR token and card link token are only released for approved registrations.
    out.checkin_token = data.checkin_token;
    out.card_token = data.card_token;
    const { data: signed, error: signError } = await sb.storage.from("photos").createSignedUrl(data.photo_path, 300);
    if (!signError) out.photo_url = signed.signedUrl;
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store, private" } });
}
