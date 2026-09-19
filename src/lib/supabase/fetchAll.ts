type Page<T> = { data: T[] | null; error: { message: string } | null };

// PostgREST caps every response at the project's `max_rows` (1000 by default)
// and returns just the first page - no error, no warning - so a plain
// `.select()` silently drops rows once a table grows past that. This walks
// the result in pages until it's exhausted.
//
// - `build(from, to)` must apply `.range(from, to)` and a *stable, unique*
//   ordering (e.g. `.order("x").order("id")`), or rows can repeat/skip across pages.
// - `pageSize` must not exceed the project's max_rows: a short page is how
//   we know we've reached the end.
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<Page<T>>,
  { pageSize = 1000, maxRows = 100_000 }: { pageSize?: number; maxRows?: number } = {}
): Promise<{ data: T[]; error: string | null }> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) return { data: rows, error: error.message };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
  }
  return { data: rows, error: `Too many rows to load at once (limit ${maxRows.toLocaleString()}).` };
}
