import test from "node:test";
import assert from "node:assert/strict";
import { requestOrigin } from "../lib/site.js";

const h = (o) => ({ get: (k) => o[k.toLowerCase()] ?? null });

test("requestOrigin uses the forwarded host and protocol", () => {
  assert.equal(requestOrigin(h({ "x-forwarded-host": "reunion.example.com", "x-forwarded-proto": "https" })), "https://reunion.example.com");
  assert.equal(requestOrigin(h({ host: "mysite.vercel.app" })), "https://mysite.vercel.app");
  assert.equal(requestOrigin(h({ host: "localhost:3000" })), "http://localhost:3000");
  assert.equal(requestOrigin(h({})), "");
});
