"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/paging";

/**
 * Previous / next pager for limit/offset lists. Without a total, the next page is
 * offered while the current one is full.
 */
export function Pagination({
  page,
  onPageChange,
  count,
  total,
  pageSize = PAGE_SIZE,
}: {
  page: number;
  onPageChange: (page: number) => void;
  /** Rows on the current page. */
  count: number;
  total?: number;
  pageSize?: number;
}) {
  const first = count === 0 ? 0 : page * pageSize + 1;
  const last = page * pageSize + count;
  const hasNext = total !== undefined ? last < total : count === pageSize;
  if (page === 0 && !hasNext) {
    return (
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {total !== undefined
          ? `${total} résultat${total > 1 ? "s" : ""}`
          : `${count} résultat${count > 1 ? "s" : ""}`}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5 text-xs text-muted-foreground">
      <span className="tabular">
        {first}–{last}
        {total !== undefined ? ` sur ${total}` : ""}
      </span>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft /> Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
