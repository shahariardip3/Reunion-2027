// Helpers that keep writes working when the Supabase project is one release behind the code
// (a missing optional column or a missing Storage bucket must not stop a registration or an upload).

/**
 * Insert a row; if the database lacks some OPTIONAL columns (schema.sql not re-run yet), retry without them.
 * Returns { data, error, dropped } where `dropped` lists the optional columns that were skipped.
 */
export async function insertCompat(sb, table, row, optionalColumns = [], select = "*") {
  const run = (payload) => sb.from(table).insert(payload).select(select).single();
  const first = await run(row);
  if (!first.error) return { ...first, dropped: [] };
  const present = optionalColumns.filter((c) => c in row);
  // Duplicates and permission problems cannot be fixed by dropping columns; report them as they are.
  if (!present.length || ["23505", "42501"].includes(String(first.error.code))) return { ...first, dropped: [] };
  const slim = { ...row };
  for (const c of present) delete slim[c];
  console.warn(`[db-compat] ${table}: insert failed (${first.error.code} ${first.error.message}); retrying without optional columns: ${present.join(", ")}`);
  const second = await run(slim);
  // If the slim attempt also fails, show the ORIGINAL error: it is the more useful clue.
  return second.error ? { ...first, dropped: [] } : { ...second, dropped: present };
}

const isBucketMissing = (error) => {
  const text = `${error?.message || ""} ${error?.error || ""}`.toLowerCase();
  return String(error?.statusCode || error?.status || "") === "404" || text.includes("bucket not found") || text.includes("not found");
};

/** Upload to Storage; if the bucket does not exist yet, create it (service role) and retry once. */
export async function uploadCompat(sb, bucket, path, bytes, options, bucketOptions) {
  let result = await sb.storage.from(bucket).upload(path, bytes, options);
  if (!result.error || !isBucketMissing(result.error)) return result;
  const created = await sb.storage.createBucket(bucket, bucketOptions);
  if (created.error && !/already exists|duplicate/i.test(created.error.message || "")) {
    console.error(`[db-compat] could not create storage bucket "${bucket}":`, created.error.message);
    return result;
  }
  console.warn(`[db-compat] storage bucket "${bucket}" was missing and has been created.`);
  return sb.storage.from(bucket).upload(path, bytes, options);
}
