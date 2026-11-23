import { db } from "../../../../lib/supabase";
import { isMainAdmin } from "../../../../lib/auth";
import { fail, json, dbFail } from "../../../../lib/http";

export async function GET() {
  if (!(await isMainAdmin())) return fail("Unauthorized", 401);
  const { data, error } = await db().from("activity_logs").select("*").order("created_at", { ascending: false }).limit(250);
  if (error) return dbFail("activity-log", "Could not load Activity Log.", error, { admin: true });
  return json({ logs: data || [] }, 200, { "Cache-Control": "no-store" });
}
