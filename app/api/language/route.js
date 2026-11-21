import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json().catch(() => null);
  const lang = body?.lang;
  if (lang !== "bn" && lang !== "en") {
    return NextResponse.json({ error: "Invalid language" }, { status: 400 });
  }
  const response = NextResponse.json({ ok: true, lang });
  response.cookies.set("site_lang", lang, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365
  });
  return response;
}
