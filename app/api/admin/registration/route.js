import { db } from "../../../../lib/supabase";
import { isAdmin } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";

export async function POST(req) {
  if (!(await isAdmin())) return fail("Unauthorized", 401);
  const csrf = csrfGuard(req); if (csrf) return csrf;
  const limited = await rateLimit(req, "admin-write", 90, 60); if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const { id, action, value } = body;
  if (typeof id !== "string" || !UUID_RE.test(id)) return fail("Invalid registration ID.");
  const sb = db();
  const oops = (label, message, error) => dbFail(`registration:${label}`, message, error, { admin: true });

  switch (action) {
    case "approve": {
      const { data, error } = await sb.rpc("approve_registration", { p_id: id });
      return error ? oops(action, "Could not approve registration.", error) : json({ code: data });
    }
    case "reject":
    case "pending": {
      // "pending" lets the admin undo an accidental approval/rejection (the issued ID is kept).
      const { error } = await sb.from("registrations").update({ status: action === "reject" ? "rejected" : "pending" }).eq("id", id);
      return error ? oops(action, "Could not update registration status.", error) : json({ ok: true });
    }
    case "phone_public": {
      if (typeof value !== "boolean") return fail("Invalid phone visibility value.");
      const { error } = await sb.from("registrations").update({ phone_public: value }).eq("id", id);
      return error ? oops(action, "Could not update phone visibility.", error) : json({ ok: true });
    }
    case "attended": {
      if (typeof value !== "boolean") return fail("Invalid attendance value.");
      const patch = value ? { attended_at: new Date().toISOString(), attended_by: "admin" } : { attended_at: null, attended_by: null };
      let q = sb.from("registrations").update(patch).eq("id", id);
      if (value) q = q.eq("status", "approved");
      const { data, error } = await q.select("id").maybeSingle();
      if (error) return oops(action, "Could not update attendance.", error);
      return data ? json({ ok: true }) : fail("Approved registration not found.", 404);
    }
    case "delete": {
      const { data: row, error: readError } = await sb.from("registrations").select("photo_path").eq("id", id).maybeSingle();
      if (readError) return oops("delete-read", "Could not find the registration.", readError);
      if (row?.photo_path) await sb.storage.from("photos").remove([row.photo_path]);
      const { error } = await sb.from("registrations").delete().eq("id", id);
      return error ? oops(action, "Could not delete registration.", error) : json({ ok: true });
    }
    default:
      return fail("Invalid action.");
  }
}
