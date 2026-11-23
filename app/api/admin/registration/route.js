export const runtime = "nodejs";
import { db } from "../../../../lib/supabase";
import { getAdminSession, verifyMainReauth } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";
import { sendApprovalEmail } from "../../../../lib/email";
import { writeAudit } from "../../../../lib/audit-log";

export async function POST(req) {
  const session = await getAdminSession();
  if (!session) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-write", 90, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const { id, action, value } = body;
  if (typeof id !== "string" || !UUID_RE.test(id)) return fail("Invalid registration ID.");

  const main = session.role === "main";
  const sb = db();
  const oops = (label, message, error) => dbFail(`registration:${label}`, message, error, { admin: true });
  const getRow = async () => {
    const { data, error } = await sb.from("registrations").select("*").eq("id", id).maybeSingle();
    return { data, error };
  };

  switch (action) {
    case "approve": {
      const { data: before, error: readError } = await getRow();
      if (readError) return oops("approve-read", "Could not read registration.", readError);
      if (!before) return fail("Registration not found.", 404);
      const { data: code, error } = await sb.rpc("approve_registration", { p_id: id });
      if (error) return oops(action, "Could not approve registration.", error);
      await writeAudit("registration_approved", before, { previous_status: before.status, new_status: "approved", reg_code: code });
      let emailSent = false;
      if (before.status !== "approved" && before.email) {
        const { data: approvedRow } = await sb.from("registrations").select("*").eq("id", id).maybeSingle();
        if (approvedRow) emailSent = (await sendApprovalEmail(approvedRow)).sent === true;
      }
      return json({ code, email_sent: emailSent });
    }
    case "reject": {
      const { data: before, error: readError } = await getRow();
      if (readError) return oops("reject-read", "Could not read registration.", readError);
      if (!before) return fail("Registration not found.", 404);
      const { data, error } = await sb.from("registrations").update({ status: "rejected" }).eq("id", id).select("*").maybeSingle();
      if (error) return oops(action, "Could not reject registration.", error);
      await writeAudit("registration_rejected", before, { previous_status: before.status, new_status: "rejected" });
      return json({ ok: true });
    }
    case "pending": {
      if (!main) return fail("Only Main Admin can move a registration back to pending.", 403);
      const { data: before, error: readError } = await getRow();
      if (readError) return oops("pending-read", "Could not read registration.", readError);
      if (!before) return fail("Registration not found.", 404);
      const { error } = await sb.from("registrations").update({ status: "pending" }).eq("id", id);
      if (error) return oops(action, "Could not update registration status.", error);
      await writeAudit("registration_moved_to_pending", before, { previous_status: before.status, new_status: "pending" });
      return json({ ok: true });
    }
    case "phone_public": {
      if (!main) return fail("Only Main Admin can change phone visibility.", 403);
      if (typeof value !== "boolean") return fail("Invalid phone visibility value.");
      const { data: before } = await getRow();
      const { error } = await sb.from("registrations").update({ phone_public: value }).eq("id", id);
      if (error) return oops(action, "Could not update phone visibility.", error);
      await writeAudit("phone_visibility_changed", before, { phone_public: value });
      return json({ ok: true });
    }
    case "attended":
    case "gift_received":
    case "food_received": {
      if (typeof value !== "boolean") return fail("Invalid received status value.");
      if (!value && (!main || !verifyMainReauth(body.main_password))) return fail("Main Admin password re-authentication is required to unmark.", 403);
      const fields = {
        attended: { timestamp: "attended_at", by: "attended_by" },
        gift_received: { timestamp: "gift_received_at", by: "gift_received_by" },
        food_received: { timestamp: "food_received_at", by: "food_received_by" },
      };
      const field = fields[action];
      const { data: before, error: readError } = await getRow();
      if (readError) return oops(`${action}-read`, "Could not read registration.", readError);
      if (!before) return fail("Registration not found.", 404);
      const patch = value
        ? { [field.timestamp]: new Date().toISOString(), [field.by]: session.name || session.username }
        : { [field.timestamp]: null, [field.by]: null };
      let query = sb.from("registrations").update(patch).eq("id", id);
      if (value) query = query.eq("status", "approved");
      const { data, error } = await query.select("id").maybeSingle();
      if (error) return oops(action, "Could not update received status.", error);
      if (!data) return fail("Approved registration not found.", 404);
      await writeAudit(value ? `${action}_marked` : `${action}_unmarked`, before, { previous_value: before[field.timestamp], new_value: value ? patch[field.timestamp] : null });
      return json({ ok: true });
    }
    case "delete": {
      if (!main) return fail("Only Main Admin can delete registrations.", 403);
      if (!verifyMainReauth(body.main_password)) return fail("Main Admin password re-authentication failed.", 403);
      const { data: row, error: readError } = await getRow();
      if (readError) return oops("delete-read", "Could not find the registration.", readError);
      if (!row) return fail("Registration not found.", 404);
      const { data: trash, error: trashError } = await sb.from("registration_trash").insert({
        original_id: row.id, registration_data: row, deleted_by: session.name || session.username,
      }).select("id").single();
      if (trashError) return oops("delete-trash", "Could not move registration to Recycle Bin.", trashError);
      const { error } = await sb.from("registrations").delete().eq("id", id);
      if (error) {
        await sb.from("registration_trash").delete().eq("id", trash.id);
        return oops("delete", "Could not delete registration.", error);
      }
      await writeAudit("registration_soft_deleted", row, { recycle_bin_id: trash.id });
      return json({ ok: true, recycle_bin_id: trash.id });
    }
    default:
      return fail("Invalid action.");
  }
}
