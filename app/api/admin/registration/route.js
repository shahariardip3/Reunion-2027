
import { db } from "../../../../lib/supabase";
import { isAdmin } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";

export async function POST(req) {
  if (!(await isAdmin())) {
    return fail("Unauthorized", 401);
  }

  const csrf = csrfGuard(req);
  if (csrf) return csrf;

  const limited = await rateLimit(req, "admin-write", 90, 60);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const { id, action, value } = body;

  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return fail("Invalid registration ID.");
  }

  const sb = db();

  const oops = (label, message, error) =>
    dbFail(`registration:${label}`, message, error, { admin: true });

  switch (action) {
    case "approve": {
      const { data, error } = await sb.rpc("approve_registration", {
        p_id: id,
      });

      return error
        ? oops(action, "Could not approve registration.", error)
        : json({ code: data });
    }

    case "reject":
    case "pending": {
      const { error } = await sb
        .from("registrations")
        .update({
          status: action === "reject" ? "rejected" : "pending",
        })
        .eq("id", id);

      return error
        ? oops(action, "Could not update registration status.", error)
        : json({ ok: true });
    }

    case "phone_public": {
      if (typeof value !== "boolean") {
        return fail("Invalid phone visibility value.");
      }

      const { error } = await sb
        .from("registrations")
        .update({ phone_public: value })
        .eq("id", id);

      return error
        ? oops(action, "Could not update phone visibility.", error)
        : json({ ok: true });
    }

    case "attended":
    case "gift_received":
    case "food_received": {
      if (typeof value !== "boolean") {
        return fail("Invalid received status value.");
      }

      const fields = {
        attended: {
          timestamp: "attended_at",
          by: "attended_by",
          message: "Could not update attendance.",
        },
        gift_received: {
          timestamp: "gift_received_at",
          by: "gift_received_by",
          message: "Could not update gift status.",
        },
        food_received: {
          timestamp: "food_received_at",
          by: "food_received_by",
          message: "Could not update food status.",
        },
      };

      const field = fields[action];

      const patch = value
        ? {
            [field.timestamp]: new Date().toISOString(),
            [field.by]: "admin",
          }
        : {
            [field.timestamp]: null,
            [field.by]: null,
          };

      let query = sb
        .from("registrations")
        .update(patch)
        .eq("id", id);

      // Only approved registrations can be marked as received/attended.
      if (value) {
        query = query.eq("status", "approved");
      }

      const { data, error } = await query
        .select("id")
        .maybeSingle();

      if (error) {
        return oops(action, field.message, error);
      }

      if (!data) {
        return fail("Approved registration not found.", 404);
      }

      return json({ ok: true });
    }

    case "delete": {
      const { data: row, error: readError } = await sb
        .from("registrations")
        .select("photo_path")
        .eq("id", id)
        .maybeSingle();

      if (readError) {
        return oops(
          "delete-read",
          "Could not find the registration.",
          readError
        );
      }

      if (!row) {
        return fail("Registration not found.", 404);
      }

      if (row.photo_path) {
        const { error: storageError } = await sb.storage
          .from("photos")
          .remove([row.photo_path]);

        if (storageError) {
          console.error(
            "[registration:delete-photo]",
            storageError.message
          );
        }
      }

      const { error } = await sb
        .from("registrations")
        .delete()
        .eq("id", id);

      return error
        ? oops(action, "Could not delete registration.", error)
        : json({ ok: true });
    }

    default:
      return fail("Invalid action.");
  }
}
