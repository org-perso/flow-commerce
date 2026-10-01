import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';

/** Items per page: enough to fill a screen and a half. */
export const PAGE_SIZE = 30;

export type Page = { limit: number; offset: number };

/** Adds `limit` / `offset` to a query string. */
export function setPage(params: URLSearchParams, page?: Page) {
  if (!page) return;
  params.set('limit', String(page.limit));
  params.set('offset', String(page.offset));
}

/**
 * A list loaded 30 by 30 (infinite scroll). `items` are the loaded pages, flattened;
 * `loadMore` fetches the next page if there is one (wire it to onEndReached).
 * `pageItems` picks the list out of a page when the API wraps it (e.g. { items, total }).
 */
export function usePagedList<TPage, TItem>({
  queryKey,
  fetchPage,
  pageItems,
  enabled = true,
}: {
  queryKey: QueryKey;
  fetchPage: (page: Page) => Promise<TPage>;
  pageItems: (page: TPage) => TItem[];
  enabled?: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPage({ limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (last, all) =>
      pageItems(last).length < PAGE_SIZE ? undefined : all.length * PAGE_SIZE,
    enabled,
  });
  const items = useMemo(() => query.data?.pages.flatMap(pageItems) ?? [], [query.data, pageItems]);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };
  return { ...query, items, firstPage: query.data?.pages[0], loadMore };
}

/** Identity picker for APIs that return a plain array. */
export const asList = <T>(page: T[]) => page;
