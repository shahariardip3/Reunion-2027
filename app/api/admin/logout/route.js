import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { csrfGuard } from "../../../../lib/security";
import { revokeAdminSession } from "../../../../lib/auth";
export async function POST(req) {
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const store = await cookies();
  await revokeAdminSession(store.get("admin")?.value || "");
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
