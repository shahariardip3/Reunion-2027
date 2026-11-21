import { redirect } from "next/navigation";
import { db } from "../../lib/supabase";
import { isAdmin } from "../../lib/auth";
import { signedUrlMap } from "../../lib/photos";
import AdminPanel from "./AdminPanel";
import { getLang } from "../../lib/server-lang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Page() {
  if (!(await isAdmin())) redirect("/admin/login");
  const lang = await getLang();
  const sb = db();
  const [{ data: s }, { data: rows }, { data: noticeRows }] = await Promise.all([
    sb.from("settings").select("*").eq("id", 1).maybeSingle(),
    sb.from("registrations").select("*").order("created_at", { ascending: false }),
    sb.from("notices").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  const urls = await signedUrlMap(sb, (rows || []).map((r) => r.photo_path), 600);
  const regs = (rows || []).map((r) => ({ ...r, photo_url: urls[r.photo_path] || "" }));
  return <AdminPanel settings={s || {}} regs={regs} lang={lang} notices={noticeRows || []} />;
}
