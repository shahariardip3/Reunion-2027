
import { db } from "../../../../lib/supabase";
import { isAdmin } from "../../../../lib/auth";
import { csrfGuard, rateLimit } from "../../../../lib/security";
import { fail, json, dbFail, UUID_RE } from "../../../../lib/http";

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
  "id,full_name,ssc_batch,profession,reg_code,status,attended_at,attended_by,gift_received_at,gift_received_by,food_received_at,food_received_by";

export async function POST(req) {
  // Admin-only access
  if (!(await isAdmin())) {
    return fail("Unauthorized", 401);
  }

  // CSRF protection
  const csrf = csrfGuard(req);
  if (csrf) return csrf;

  // Rate limiting
  const limited = await rateLimit(
    req,
    "admin-checkin",
    120,
    60
  );

  if (limited) return limited;

  const body = await req.json().catch(() => ({}));

  // Find registration by QR token or Registration ID
  const token =
    typeof body.token === "string"
      ? body.token.trim()
      : "";

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

  // VERIFY ALUMNI
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
      return fail(
        "This registration is not approved.",
        409
      );
    }

    return json(
      {
        ok: true,
        registration: data,
        already_attended: !!data.attended_at,
      },
      200,
      { "Cache-Control": "no-store" }
    );
  }

  // ATTENDANCE, GIFT AND FOOD ACTIONS
  const config = ACTIONS[body.action];

  if (!config) {
    return fail("Invalid check-in action.");
  }

  const timestamp = new Date().toISOString();

  const updateData = {
    [config.timestamp]: timestamp,
    [config.by]: "admin",
  };

  // Update only if this action has not already been completed.
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
    return json({
      ok: true,
      message: "Action completed successfully.",
      registration: data,
    });
  }

  // Check whether the registration exists and whether
  // this action has already been completed.
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
    return fail(
      "This registration is not approved.",
      409
    );
  }

  if (existing[config.timestamp]) {
    return fail(
      config.already,
      409,
      {
        already_received: true,
        registration: existing,
      }
    );
  }

  return fail(
    "Could not complete this action. Please try again.",
    409
  );
}
