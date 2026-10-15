import type { ReactNode } from "react";

import { RefreshButton } from "@/components/app/refresh-button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  refresh,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** "Actualiser" next to the title (list pages). */
  refresh?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl leading-8 font-bold tracking-tight">
            {title}
          </h1>
          {refresh && <RefreshButton />}
        </div>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
