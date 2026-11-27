import { NextResponse } from "next/server";
import { makeToken, passwordOk, isAdminAuthConfigured, adminCookieOptions, verifySubAdmin, persistAdminSession } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";

export async function POST(req) {
  if (!isAdminAuthConfigured()) return NextResponse.json({ error: "Main Admin login is not configured. Set ADMIN_PASSWORD (16+ characters) and ADMIN_SECRET (32+ characters)." }, { status: 503 });
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-login", 8, 900); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "sub" ? "sub" : "main";
  // Per-account lockout that ignores the IP, so rotating IPs does not help a password-guessing attack.
  // 30 (not 12) so a stranger cannot lock the real admin out with a handful of wrong guesses; the per-IP limit above stays at 8.
  const target = mode === "sub" ? `sub:${String(body.username || "").trim().toLowerCase()}` : "main";
  const locked = await rateLimit(req, "admin-login-target", 30, 900, { subject: target, perIp: false }); if (locked) return locked;
  let session;
  if (mode === "main") {
    if (!passwordOk(body.password)) { console.warn("[admin-login] failed main login"); return NextResponse.json({ error: "Invalid credentials." }, { status: 401 }); }
    session = { role: "main", username: "main", name: "Main Admin" };
  } else {
    session = await verifySubAdmin(body.username, body.password);
    if (!session) { console.warn("[admin-login] failed sub-admin login for", target); return NextResponse.json({ error: "Invalid credentials." }, { status: 401 }); }
  }
  const token = makeToken(session);
  try { await persistAdminSession(token, session); } catch (error) { console.error("[admin-login:session]", error.message); return NextResponse.json({ error: "Could not create admin session. Apply the v8 database migration." }, { status: 503 }); }
  const res = NextResponse.json({ ok: true, role: session.role, name: session.name });
  res.cookies.set("admin", token, adminCookieOptions);
  return res;
}
