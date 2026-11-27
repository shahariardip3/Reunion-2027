import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../../lib/security";
import { db } from "../../../../../lib/supabase";
import { fail } from "../../../../../lib/http";
import { toCsv } from "../../../../../lib/csv";
import { writeAudit } from "../../../../../lib/audit-log";
const columns = ["reg_code","full_name","ssc_batch","profession","phone","email","pay_method","trx_id","fee_amount","status","attended_at","created_at"];
export async function POST(req) {
  const session = await getAdminSession();
  if (!session || session.role !== "main") return fail("Only Main Admin can export registrations.", 403);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-bulk-export", 10, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids)] : [];
  if (!ids.length || ids.length > 500 || ids.some((id) => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) return fail("Select between 1 and 500 registrations.");
  const { data, error } = await db().from("registrations").select(columns.join(",")).in("id", ids);
  if (error) return fail("Could not export selected registrations.", 503);
  await writeAudit("export_csv", null, { rows: (data || []).length, scope: "selected" });
  return new NextResponse(toCsv(columns, data), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="reunion-selected-registrations.csv"', "Cache-Control": "no-store" } });
}
