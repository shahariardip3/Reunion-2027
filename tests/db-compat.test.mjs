import test from "node:test";
import assert from "node:assert/strict";
import { insertCompat, uploadCompat } from "../lib/db-compat.js";

const fakeDb = (missing) => ({
  calls: [],
  from(table) {
    const self = this;
    return { insert(row) { self.calls.push(row); const bad = missing.find((c) => c in row);
      return { select: () => ({ single: async () => bad ? { data: null, error: { code: "PGRST204", message: `no ${bad}` } } : { data: { id: 1, ...row }, error: null } }) }; } };
  },
});

test("insert retries without optional columns an old database does not have", async () => {
  const sb = fakeDb(["fee_amount"]);
  const r = await insertCompat(sb, "registrations", { full_name: "A", fee_amount: 500 }, ["fee_amount"]);
  assert.equal(r.error, null); assert.deepEqual(r.dropped, ["fee_amount"]);
  assert.equal(sb.calls.length, 2); assert.ok(!("fee_amount" in sb.calls[1]));
});

test("a missing REQUIRED column is still reported", async () => {
  const sb = fakeDb(["full_name"]);
  const r = await insertCompat(sb, "registrations", { full_name: "A" }, ["fee_amount"]);
  assert.equal(r.error.code, "PGRST204");
});

test("upload creates a missing bucket once and retries", async () => {
  let created = 0, uploads = 0;
  const sb = { storage: {
    from: () => ({ upload: async () => (++uploads === 1 ? { error: { statusCode: "404", message: "Bucket not found" } } : { data: {}, error: null }) }),
    createBucket: async () => { created++; return { error: null }; },
  } };
  const r = await uploadCompat(sb, "photos", "x.jpg", Buffer.from("a"), {}, {});
  assert.equal(r.error, null); assert.equal(created, 1); assert.equal(uploads, 2);
});
