"use client";

import { Search, X } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex h-9 items-center gap-2 rounded-md border border-input bg-card px-3 text-muted-foreground shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30",
        className,
      )}
    >
      <Search className="size-4 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Effacer"
          onClick={() => onValueChange("")}
          className="rounded hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </label>
  );
}
