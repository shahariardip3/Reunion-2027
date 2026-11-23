import { db } from "./supabase";
import { getAdminSession } from "./auth";

export async function writeAudit(action, registration = null, details = {}) {
  try {
    const admin = await getAdminSession();
    if (!admin) return;
    const { error } = await db().from("activity_logs").insert({
      admin_username: admin.username || "unknown",
      admin_name: admin.name || "Admin",
      admin_role: admin.role,
      action: String(action).slice(0, 80),
      registration_id: registration?.id || null,
      registration_name: registration?.full_name || null,
      details: details && typeof details === "object" ? details : {},
    });
    if (error) console.error("[audit-log]", error.message);
  } catch (e) { console.error("[audit-log]", e?.message || e); }
}
