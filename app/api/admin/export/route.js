import { db } from "../../../../lib/supabase";
import { getAdminSession } from "../../../../lib/auth";
import { rateLimit } from "../../../../lib/security";
import { writeAudit } from "../../../../lib/audit-log";
import { toCsv } from "../../../../lib/csv";

const COLS = ["reg_code", "full_name", "ssc_batch", "profession", "phone", "email", "tshirt_size", "phone_public", "pay_method", "trx_id", "status", "attended_at", "created_at"];

export async function GET(req) {
  const session = await getAdminSession();
  if (!session || session.role !== "main") return new Response("Unauthorized", { status: 401 });
  const limited = await rateLimit(req, "admin-export", 10, 60); if (limited) return limited;
  // Only the exported columns are read (no photo paths / tokens), and the export is written to the audit log.
  const { data, error } = await db().from("registrations").select(COLS.join(",")).order("created_at");
  if (error) return new Response("Could not export registrations.", { status: 503 });
  await writeAudit("export_csv", null, { rows: (data || []).length, scope: "all" });
  return new Response(toCsv(COLS, data), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=registrations-${new Date().toISOString().slice(0, 10)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
