/** Shared CSV helpers. Cells that start with = + - @ (or tab/CR) are prefixed with ' so Excel/Sheets never run them as formulas. */
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

/** UTF-8 BOM (so Excel reads Bangla correctly) + CRLF line endings. */
export function toCsv(columns, rows) {
  const lines = [columns.join(","), ...(rows || []).map((row) => columns.map((c) => csvCell(row[c])).join(","))];
  return "\uFEFF" + lines.join("\r\n");
}
