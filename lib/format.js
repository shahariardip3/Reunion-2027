// Shared input helpers (used on both client and server).
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Converts Bangla digits (০-৯) to ASCII digits so users can type in either script. */
export function normalizeDigits(value) {
  return String(value ?? "").replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Normalises a Bangladeshi mobile number to the local 01XXXXXXXXX form. */
export function normalizePhone(value) {
  let s = normalizeDigits(value).replace(/[\s\-().]/g, "");
  if (s.startsWith("+880")) s = "0" + s.slice(4);
  else if (s.startsWith("880") && s.length === 13) s = "0" + s.slice(3);
  return s;
}

/** Transaction IDs are stored upper-case without spaces. */
export function normalizeTrx(value) {
  return normalizeDigits(value).replace(/\s/g, "").toUpperCase();
}

export const PHONE_RE = /^01\d{9}$/;
// Mobile-wallet TrxIDs are alphanumeric; bank references may also contain - _ /
export const TRX_RE = /^[A-Z0-9][A-Z0-9\-_/]{4,39}$/;
