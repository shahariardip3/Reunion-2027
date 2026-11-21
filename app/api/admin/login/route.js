import { NextResponse } from "next/server";
import { makeToken, passwordOk, isAdminAuthConfigured, adminCookieOptions } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";

export async function POST(req) {
  if (!isAdminAuthConfigured()) return NextResponse.json({ error: "Admin login is not configured. In .env.local, set ADMIN_PASSWORD (at least 16 characters) and ADMIN_SECRET (at least 32 characters), then restart the server." }, { status: 503 });
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-login", 5, 900); if (limited) return limited;
  const { password } = await req.json().catch(() => ({}));
  if (!passwordOk(password)) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", makeToken(), adminCookieOptions);
  return res;
}
