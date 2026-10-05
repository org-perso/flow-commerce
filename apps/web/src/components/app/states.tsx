"use client";

import {
  AlertTriangle,
  Loader2,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-navy-soft text-navy">
        <Icon className="size-6" />
      </span>
      <div className="max-w-sm">
        <p className="font-semibold">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger",
        className,
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{apiErrorMessage(error)}</span>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="text-foreground"
        >
          <RotateCw /> Réessayer
        </Button>
      )}
    </div>
  );
}

export function InlineAlert({
  tone = "warning",
  icon: Icon = AlertTriangle,
  children,
  action,
  className,
}: {
  tone?: "warning" | "danger" | "info" | "success";
  icon?: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    warning: "bg-gold-soft text-gold-ink",
    danger: "bg-danger-soft text-danger",
    info: "bg-navy-soft text-navy",
    success: "bg-success-soft text-success",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3 text-sm",
        tones[tone],
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

export function TableSkeletonRows({
  columns,
  rows = 8,
}: {
  columns: number;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: columns }, (_, c) => (
            <TableCell key={c}>
              <Skeleton
                className={cn(
                  "h-4",
                  c === 0 ? "w-16" : c % 3 === 0 ? "w-20" : "w-28",
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function FullScreenLoader({
  label = "Chargement…",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin text-navy" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
