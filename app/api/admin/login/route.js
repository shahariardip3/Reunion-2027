import { NextResponse } from "next/server";
import { makeToken, passwordOk, isAdminAuthConfigured, adminCookieOptions, verifySubAdmin } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";

export async function POST(req) {
  if (!isAdminAuthConfigured()) return NextResponse.json({ error: "Main Admin login is not configured. Set ADMIN_PASSWORD (16+ characters) and ADMIN_SECRET (32+ characters)." }, { status: 503 });
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-login", 8, 900); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "sub" ? "sub" : "main";
  let session;
  if (mode === "main") {
    if (!passwordOk(body.password)) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    session = { role: "main", username: "main", name: "Main Admin" };
  } else {
    session = await verifySubAdmin(body.username, body.password);
    if (!session) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, role: session.role, name: session.name });
  res.cookies.set("admin", makeToken(session), adminCookieOptions);
  return res;
}
