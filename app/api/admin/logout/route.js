import { NextResponse } from "next/server";
import { csrfGuard } from "../../../../lib/security";
export async function POST(req) {
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}
