
import { db } from "../../../../lib/supabase";
import { getAdminSession } from "../../../../lib/auth";
import { writeAudit } from "../../../../lib/audit-log";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";
import { signedUrlMap } from "../../../../lib/photos";

const CODE_RE = /^REU-\d{4,8}$/;

const ACTIONS = {
  attend: {
    timestamp: "attended_at",
    by: "attended_by",
    error: "Could not mark attendance.",
    already: "Already marked as attended.",
  },
  gift: {
    timestamp: "gift_received_at",
    by: "gift_received_by",
    error: "Could not mark gift as received.",
    already: "Gift has already been marked as received.",
  },
  food: {
    timestamp: "food_received_at",
    by: "food_received_by",
    error: "Could not mark food as received.",
    already: "Food has already been marked as received.",
  },
};

const REGISTRATION_FIELDS =
  "id,full_name,ssc_batch,profession,phone,email,tshirt_size,reg_code,status,photo_path,attended_at,attended_by,gift_received_at,gift_received_by,food_received_at,food_received_by";

export async function POST(req) {
  // Admin authentication
  const session = await getAdminSession();
  if (!session) return fail("Unauthorized", 401);

  // CSRF protection
  const csrf = csrfGuard(req);
  if (csrf) return csrf;

  // Rate limiting
  const limited = await rateLimit(req, "admin-checkin", 120, 60);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));

  // Read QR token or registration ID
  const token =
    typeof body.token === "string" ? body.token.trim() : "";

  const code =
    typeof body.code === "string"
      ? body.code.trim().toUpperCase()
      : "";

  let field;
  let value;

  if (UUID_RE.test(token)) {
    field = "checkin_token";
    value = token;
  } else if (CODE_RE.test(code)) {
    field = "reg_code";
    value = code;
  } else {
    return fail("Invalid QR code.");
  }

  const sb = db();

  // VERIFY ALUMNI AND GET PHOTO
  if (body.action === "verify") {
    const { data, error } = await sb
      .from("registrations")
      .select(REGISTRATION_FIELDS)
      .eq(field, value)
      .maybeSingle();

    if (error) {
      return dbFail(
        "checkin:verify",
        "Could not verify the QR code.",
        error,
        { status: 503, admin: true }
      );
    }

    if (!data) {
      return fail("QR code not found.", 404);
    }

    if (data.status !== "approved") {
      return fail("This registration is not approved.", 409);
    }

    // Generate a temporary signed URL for the alumni photo
    let photoUrl = null;

    if (data.photo_path) {
      try {
        const urls = await signedUrlMap(
          sb,
          [data.photo_path],
          3600
        );

        photoUrl = urls[data.photo_path] || null;
      } catch (photoError) {
        console.error(
          "[checkin:photo]",
          photoError?.message || photoError
        );
      }
    }

    return json(
      {
        ok: true,
        registration: {
          ...data,
          photo_url: photoUrl,
        },
        already_attended: !!data.attended_at,
      },
      200,
      { "Cache-Control": "no-store" }
    );
  }

  // MARK ATTENDANCE, GIFT OR FOOD
  // Unmark actions are intentionally not available here.
  const config = ACTIONS[body.action];

  if (!config) {
    return fail("Invalid check-in action.");
  }

  const timestamp = new Date().toISOString();

  const updateData = {
    [config.timestamp]: timestamp,
    [config.by]: session.name || session.username,
  };

  const { data, error } = await sb
    .from("registrations")
    .update(updateData)
    .eq(field, value)
    .eq("status", "approved")
    .is(config.timestamp, null)
    .select(REGISTRATION_FIELDS)
    .maybeSingle();

  if (error) {
    return dbFail(
      `checkin:${body.action}`,
      config.error,
      error,
      { admin: true }
    );
  }

  if (data) {
    await writeAudit(`${body.action}_marked`, data, { source: "qr_scanner", new_value: data[config.timestamp] });
    return json({
      ok: true,
      message: "Action completed successfully.",
      registration: data,
    });
  }

  // Check why the update did not happen
  const { data: existing, error: lookupError } = await sb
    .from("registrations")
    .select(REGISTRATION_FIELDS)
    .eq(field, value)
    .maybeSingle();

  if (lookupError) {
    return dbFail(
      `checkin:${body.action}:lookup`,
      "Could not check registration status.",
      lookupError,
      { admin: true }
    );
  }

  if (!existing) {
    return fail("QR code not found.", 404);
  }

  if (existing.status !== "approved") {
    return fail("This registration is not approved.", 409);
  }

  if (existing[config.timestamp]) {
    return fail(config.already, 409, {
      already_received: true,
      registration: existing,
    });
  }

  return fail(
    "Could not complete this action. Please try again.",
    409
  );
}
