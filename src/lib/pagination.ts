export function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export type PageInfo = {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  rangeStart: number;
  rangeEnd: number;
  hasPrev: boolean;
  hasNext: boolean;
};

// Pure so the boundary math (page 0, huge pages, empty results, exact
// multiples of the page size) can be tested without a database. `page` is
// clamped into [1, totalPages] - `from`/`to` always describe real rows.
export function paginate(requestedPage: number, pageSize: number, totalCount: number): PageInfo {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return {
    page,
    totalPages,
    from,
    to,
    rangeStart: totalCount === 0 ? 0 : from + 1,
    rangeEnd: totalCount === 0 ? 0 : Math.min(from + pageSize, totalCount),
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}
