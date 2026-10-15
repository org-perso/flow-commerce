"use client";

import { ArrowDown, ArrowUp, ChartColumn, Download } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Segmented } from "@/components/app/segmented";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useProductSales,
  type ProductSales,
} from "@/features/report/report-api";
import { can } from "@/features/shop/roles";
import { useShop } from "@/features/shop/shop-context";
import {
  addDays,
  businessToday,
  formatAr,
  formatIsoDate,
  monthRange,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "year" | "custom";
const PERIODS = [
  { value: "week", label: "Cette semaine" },
  { value: "month", label: "Ce mois" },
  { value: "year", label: "Cette année" },
  { value: "custom", label: "Date personnalisée" },
] as const;

type SortKey = "productName" | "quantity" | "revenue" | "margin";

/** Days of a preset period, today included (weeks start on Monday). */
function presetRange(period: Exclude<Period, "custom">): {
  from: string;
  to: string;
} {
  const today = businessToday();
  if (period === "month") return { from: monthRange(today).from, to: today };
  if (period === "year")
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  return { from: addDays(today, -weekday), to: today };
}

/** CSV for Excel (semicolon, as French Excel expects), whole numbers in Ariary. */
function downloadCsv(
  rows: ProductSales[],
  withRevenue: boolean,
  withMargin: boolean,
  from: string,
  to: string,
) {
  const header = [
    "Produit",
    "Quantité vendue",
    ...(withRevenue ? ["Chiffre d'affaires (Ar)"] : []),
    ...(withMargin ? ["Coût (Ar)", "Marge (Ar)"] : []),
  ];
  const lines = rows.map((r) => [
    `"${r.productName.replace(/"/g, '""')}"`,
    r.quantity,
    ...(withRevenue ? [r.revenue ?? 0] : []),
    ...(withMargin ? [r.cost ?? 0, r.margin ?? 0] : []),
  ]);
  const csv = "﻿" + [header, ...lines].map((l) => l.join(";")).join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `ventes-par-produit_${from}_${to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type Sort = { key: SortKey; desc: boolean };

/** Column header that sorts the table (a second click reverses the order). */
function SortHead({
  k,
  label,
  right,
  sort,
  onSort,
}: {
  k: SortKey;
  label: string;
  right?: boolean;
  sort: Sort;
  onSort: (sort: Sort) => void;
}) {
  return (
    <TableHead className={cn(right && "text-right")}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={() =>
          onSort({
            key: k,
            desc: sort.key === k ? !sort.desc : k !== "productName",
          })
        }
      >
        {label}
        {sort.key === k &&
          (sort.desc ? (
            <ArrowDown className="size-3.5" />
          ) : (
            <ArrowUp className="size-3.5" />
          ))}
      </button>
    </TableHead>
  );
}

export default function ReportsPage() {
  const shop = useShop();
  const today = businessToday();
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState(monthRange(today).from);
  const [to, setTo] = useState(today);
  const [sort, setSort] = useState<Sort>({
    key: "quantity",
    desc: true,
  });

  const customValid = !!from && !!to && from <= to;
  const range =
    period === "custom"
      ? customValid
        ? { from, to }
        : null
      : presetRange(period);
  const report = useProductSales(range);
  const data = report.data;
  // The CM sees quantities only (no revenue, no margin): the API does not send them.
  const withRevenue = can(shop.role, "dashboard");
  const withMargin = data?.totals.margin !== undefined;
  const columns = 2 + (withRevenue ? 1 : 0) + (withMargin ? 1 : 0);

  const rows = [...(data?.products ?? [])].sort((a, b) => {
    const dir = sort.desc ? -1 : 1;
    if (sort.key === "productName")
      return dir * a.productName.localeCompare(b.productName, "fr");
    return dir * ((a[sort.key] ?? 0) - (b[sort.key] ?? 0));
  });

  return (
    <>
      <PageHeader
        refresh
        title="Recap des ventes"
        description={
          data
            ? `${shop.name} · du ${formatIsoDate(data.from)} au ${formatIsoDate(data.to)}`
            : "Quantités vendues par produit, sur une période."
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!data || rows.length === 0}
            onClick={() =>
              data &&
              downloadCsv(rows, withRevenue, withMargin, data.from, data.to)
            }
          >
            <Download /> Exporter (CSV)
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Période"
          value={period}
          onChange={setPeriod}
          options={PERIODS}
        />
        {period === "custom" && (
          <div className="flex items-center gap-1.5 text-sm">
            <Input
              type="date"
              aria-label="Du"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-40"
            />
            <span className="text-muted-foreground">au</span>
            <Input
              type="date"
              aria-label="Au"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-40"
            />
          </div>
        )}
      </div>

      {/* Totals cards: for the owner only; the others see the recap table. */}
      {data && shop.role === "OWNER" && (
        <div
          className={cn(
            "grid gap-3",
            withMargin ? "sm:grid-cols-3" : "sm:grid-cols-2",
          )}
        >
          <Card className="gap-1 px-5 py-4">
            <span className="text-sm text-muted-foreground">
              Articles vendus
            </span>
            <span className="tabular text-2xl font-bold">
              {data.totals.quantity}
            </span>
          </Card>
          <Card className="gap-1 px-5 py-4">
            <span className="text-sm text-muted-foreground">
              Chiffre d’affaires
            </span>
            <span className="tabular text-2xl font-bold">
              {formatAr(data.totals.revenue ?? 0)}
            </span>
          </Card>
          {withMargin && (
            <Card className="gap-1 px-5 py-4">
              <span className="text-sm text-muted-foreground">Marge</span>
              <span className="tabular text-2xl font-bold text-success">
                {formatAr(data.totals.margin!)}
              </span>
            </Card>
          )}
        </div>
      )}

      {report.isError && (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead
                k="productName"
                label="Produit"
                sort={sort}
                onSort={setSort}
              />
              <SortHead
                k="quantity"
                label="Vendus"
                right
                sort={sort}
                onSort={setSort}
              />
              {withRevenue && (
                <SortHead
                  k="revenue"
                  label="Chiffre d’affaires"
                  right
                  sort={sort}
                  onSort={setSort}
                />
              )}
              {withMargin && (
                <SortHead
                  k="margin"
                  label="Marge"
                  right
                  sort={sort}
                  onSort={setSort}
                />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.isPending && range && (
              <TableSkeletonRows columns={columns} rows={6} />
            )}
            {rows.map((p) => (
              <TableRow key={p.productId}>
                <TableCell className="font-medium">{p.productName}</TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {p.quantity}
                </TableCell>
                {withRevenue && (
                  <TableCell className="tabular text-right">
                    {formatAr(p.revenue ?? 0)}
                  </TableCell>
                )}
                {withMargin && (
                  <TableCell
                    className={cn(
                      "tabular text-right",
                      (p.margin ?? 0) < 0 && "text-danger",
                    )}
                  >
                    {formatAr(p.margin ?? 0)}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {data && rows.length > 0 && (
              <TableRow className="border-t-2 bg-muted/50 hover:bg-muted/50">
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {data.totals.quantity}
                </TableCell>
                {withRevenue && (
                  <TableCell className="tabular text-right font-semibold">
                    {formatAr(data.totals.revenue ?? 0)}
                  </TableCell>
                )}
                {withMargin && (
                  <TableCell className="tabular text-right font-semibold">
                    {formatAr(data.totals.margin!)}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
        {data && rows.length === 0 && (
          <EmptyState
            icon={ChartColumn}
            title="Aucune vente sur cette période."
            className="py-12"
          />
        )}
      </Card>

      <p className="text-xs text-muted-foreground">
        Commandes confirmées et suivantes (hors annulées et retours), comptées à
        leur date de création, comme sur le tableau de bord.
      </p>
    </>
  );
}
