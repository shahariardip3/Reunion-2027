import { NextResponse } from "next/server";
import { db } from "../../../lib/supabase";
import { csrfGuard, rateLimit } from "../../../lib/security";
import { normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../../../lib/format";

export async function POST(req) {
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "status-check", 10, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const trx = normalizeTrx(typeof body.trx === "string" ? body.trx : "");
  const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
  if (!TRX_RE.test(trx) || !PHONE_RE.test(phone))
    return NextResponse.json({ error: "Transaction ID and registered phone number are required." }, { status: 400 });
  const sb = db();
  const { data, error } = await sb.from("registrations")
    .select("full_name,ssc_batch,profession,status,reg_code,photo_path,checkin_token,attended_at")
    .eq("trx_id", trx).eq("phone", phone).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not check status. Try again." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "No registration found with those details." }, { status: 404 });
  const out = { full_name: data.full_name, ssc_batch: data.ssc_batch, profession: data.profession || "", status: data.status, reg_code: data.reg_code, attended_at: data.attended_at };
  if (data.status === "approved") {
    // The QR token is only released for approved registrations.
    out.checkin_token = data.checkin_token;
    const { data: signed, error: signError } = await sb.storage.from("photos").createSignedUrl(data.photo_path, 300);
    if (!signError) out.photo_url = signed.signedUrl;
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store, private" } });
}
