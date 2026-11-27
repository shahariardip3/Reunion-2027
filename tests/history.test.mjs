import test from "node:test";
import assert from "node:assert/strict";
import { buildTimeline } from "../lib/timeline.js";

const ev = [{ id: "a", year: 1971, title_bn: "বন", title_en: "En", body_bn: "", body_en: "body" }];

test("timeline always starts in 1940 and ends with the reunion", () => {
  const t = buildTimeline({ lang: "en", events: ev, reunionDate: "2027-02-12", venue: "School ground" });
  assert.equal(t[0].year, 1940); assert.equal(t[0].kind, "start");
  assert.equal(t.at(-1).year, 2027); assert.equal(t.at(-1).kind, "end");
  assert.match(t.at(-1).body, /School ground/);
  assert.deepEqual(t.map((x) => x.year), [1940, 1971, 2027]);
});

test("titles follow the language; empty table shows only the verified 2024 profile", () => {
  assert.equal(buildTimeline({ lang: "bn", events: ev })[1].title, "বন");
  const empty = buildTimeline({ lang: "en", events: [] });
  assert.equal(empty.length, 3); assert.equal(empty[1].year, 2024);
});
