import { redirect } from "next/navigation";
import { db } from "../../lib/supabase";
import { getAdminSession } from "../../lib/auth";
import { signedUrlMap } from "../../lib/photos";
import AdminPanel from "./AdminPanel";
import { getLang } from "../../lib/server-lang";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function Page() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const lang = await getLang();
  const sb = db();
  const [{ data: rows }, settingsResult, noticesResult] = await Promise.all([
    sb.from("registrations").select("*").order("created_at", { ascending: false }),
    session.role === "main" ? sb.from("settings").select("*").eq("id", 1).maybeSingle() : sb.from("settings").select("tshirt_field_enabled,tshirt_sizes").eq("id", 1).maybeSingle(),
    session.role === "main" ? sb.from("notices").select("*").order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [] }),
  ]);
  const s = settingsResult.data;
  const noticeRows = noticesResult.data;
  const urls = await signedUrlMap(sb, (rows || []).map((r) => r.photo_path), 600);
  const regs = (rows || []).map((r) => ({ ...r, photo_url: urls[r.photo_path] || "" }));
  return <AdminPanel settings={s || {}} regs={regs} lang={lang} notices={noticeRows || []} role={session.role} adminName={session.name} />;
}
