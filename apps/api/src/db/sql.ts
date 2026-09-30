/**
 * Builds the SET clause of a partial UPDATE from the fields that are present.
 * `columns` maps API field names to SQL columns; undefined fields are skipped,
 * null fields are written as NULL. Parameter numbering starts at `firstIndex`.
 */
export function buildSet(
  patch: Record<string, unknown>,
  columns: Record<string, string>,
  firstIndex: number,
): { sql: string; values: unknown[] } {
  const assignments: string[] = [];
  const values: unknown[] = [];
  for (const [field, column] of Object.entries(columns)) {
    if (patch[field] === undefined) continue;
    values.push(patch[field]);
    assignments.push(`${column} = $${firstIndex + values.length - 1}`);
  }
  return { sql: assignments.join(', '), values };
}
