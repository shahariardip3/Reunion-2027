import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, toCsv } from "../lib/csv.js";

test("neutralises spreadsheet formulas", () => {
  for (const bad of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\tTAB"]) assert.equal(csvCell(bad), `"'${bad}"`);
  assert.equal(csvCell("Rahim"), '"Rahim"');
});

test("escapes quotes and empty values", () => {
  assert.equal(csvCell('He said "hi"'), '"He said ""hi"""');
  assert.equal(csvCell(null), '""');
});

test("toCsv adds BOM and CRLF line endings", () => {
  const out = toCsv(["a", "b"], [{ a: 1, b: "x" }, { a: 2, b: "=y" }]);
  assert.equal(out.charCodeAt(0), 0xfeff);
  assert.equal(out.slice(1), 'a,b\r\n"1","x"\r\n"2","\'=y"');
});
