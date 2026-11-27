import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDigits, normalizePhone, normalizeTrx, PHONE_RE, TRX_RE } from "../lib/format.js";

test("normalizes Bangla digits to ASCII", () => {
  assert.equal(normalizeDigits("০১৭১২৩৪৫৬৭৮"), "01712345678");
});

test("normalizes Bangladesh phone formats", () => {
  assert.equal(normalizePhone("+880 1712-345678"), "01712345678");
  assert.equal(normalizePhone("8801712345678"), "01712345678");
  assert.equal(PHONE_RE.test(normalizePhone("01712345678")), true);
  assert.equal(PHONE_RE.test(normalizePhone("017123")), false);
});

test("normalizes and validates transaction references", () => {
  assert.equal(normalizeTrx(" ab-12345 "), "AB-12345");
  assert.equal(TRX_RE.test(normalizeTrx("ab-12345")), true);
  assert.equal(TRX_RE.test(normalizeTrx("ab")), false);
});
