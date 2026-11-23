import { db } from "../../../../lib/supabase";
import { isMainAdmin } from "../../../../lib/auth";

export async function GET() {
  if (!(await isMainAdmin())) return new Response("Unauthorized", { status: 401 });
  const { data } = await db().from("registrations").select("*").order("created_at");
  const cols = ["reg_code", "full_name", "ssc_batch", "profession", "phone", "email", "tshirt_size", "phone_public", "pay_method", "trx_id", "status", "attended_at", "created_at"];
  const esc = (v) => {
    let t = String(v ?? "");
    if (/^[=+\-@]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const csv = "\uFEFF" + [cols.join(","), ...(data || []).map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=registrations-${new Date().toISOString().slice(0, 10)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
