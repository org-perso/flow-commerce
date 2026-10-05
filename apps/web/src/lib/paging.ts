/** Rows per table page (the API accepts up to 200). */
export const PAGE_SIZE = 50;

export type Page = { limit: number; offset: number };

export const pageOf = (index: number, size = PAGE_SIZE): Page => ({
  limit: size,
  offset: index * size,
});

/** Adds `limit` / `offset` to a query string. */
export function setPage(params: URLSearchParams, page?: Page) {
  if (!page) return;
  params.set("limit", String(page.limit));
  params.set("offset", String(page.offset));
}
