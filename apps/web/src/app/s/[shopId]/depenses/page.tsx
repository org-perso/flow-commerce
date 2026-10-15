"use client";

import { Plus, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { Segmented } from "@/components/app/segmented";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseFilters,
} from "@/features/expense/expense-api";
import { ExpenseDialog } from "@/features/expense/expense-dialog";
import { useExpenses } from "@/features/expense/use-expenses";
import { useCan, useShop } from "@/features/shop/shop-context";
import { useHotkey } from "@/hooks/use-hotkey";
import {
  businessToday,
  formatAr,
  formatIsoDate,
  monthRange,
} from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

type Period = "thisMonth" | "lastMonth" | "all" | "custom";

export default function ExpensesPage() {
  const shop = useShop();
  const router = useRouter();
  const allowed = useCan("expenses");
  const [period, setPeriod] = useState<Period>("thisMonth");
  const [custom, setCustom] = useState<ExpenseFilters>({});
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const today = businessToday();
  const filters: ExpenseFilters =
    period === "all"
      ? {}
      : period === "custom"
        ? custom
        : monthRange(today, period === "lastMonth" ? -1 : 0);
  const expenses = useExpenses(filters, pageOf(page));
  const rows = expenses.data?.items ?? [];

  useHotkey("a", () => setEditing("new"), allowed);
  useEffect(() => {
    if (!allowed) router.replace(`/s/${shop.id}/commandes`);
  }, [allowed, router, shop.id]);
  if (!allowed) return null;

  const changePeriod = (p: Period) => {
    setPeriod(p);
    setPage(0);
  };

  return (
    <>
      <PageHeader
        refresh
        title="Dépenses"
        description="Publicité, emballage, transport… déduits du bénéfice estimé. Les achats de produits n’en font pas partie."
        actions={
          <Button
            onClick={() => setEditing("new")}
            title="Ajouter une dépense (A)"
          >
            <Plus /> Ajouter une dépense
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Période"
          value={period}
          onChange={changePeriod}
          options={[
            { value: "thisMonth", label: "Ce mois-ci" },
            { value: "lastMonth", label: "Mois dernier" },
            { value: "all", label: "Tout" },
            { value: "custom", label: "Période…" },
          ]}
        />
        {period === "custom" && (
          <div className="flex items-center gap-1.5 text-sm">
            <Input
              type="date"
              aria-label="Du"
              value={custom.from ?? ""}
              onChange={(e) =>
                setCustom((c) => ({ ...c, from: e.target.value || undefined }))
              }
              className="h-9 w-40"
            />
            <span className="text-muted-foreground">au</span>
            <Input
              type="date"
              aria-label="Au"
              value={custom.to ?? ""}
              onChange={(e) =>
                setCustom((c) => ({ ...c, to: e.target.value || undefined }))
              }
              className="h-9 w-40"
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total des dépenses</p>
          {expenses.data ? (
            <p className="tabular text-2xl font-bold">
              {formatAr(expenses.data.total)}
            </p>
          ) : (
            <Skeleton className="mt-1 h-8 w-32" />
          )}
        </div>
      </div>

      {expenses.isError && (
        <ErrorState error={expenses.error} onRetry={() => expenses.refetch()} />
      )}
      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(expenses.isPlaceholderData && "opacity-60")}>
            {expenses.isPending && <TableSkeletonRows columns={4} />}
            {rows.map((e) => (
              <TableRow
                key={e.id}
                className="cursor-pointer"
                onClick={() => setEditing(e)}
              >
                <TableCell>{formatIsoDate(e.date)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      e.category === "ACHAT_PRODUITS" ? "warning" : "secondary"
                    }
                  >
                    {EXPENSE_CATEGORIES[e.category]}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-96 truncate text-muted-foreground">
                  {e.description ?? "—"}
                </TableCell>
                <TableCell className="tabular text-right font-semibold">
                  {formatAr(e.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {expenses.isSuccess && rows.length === 0 && (
          <EmptyState
            icon={Wallet}
            title="Aucune dépense sur cette période"
            description="Notez vos frais (publicité, emballage…) pour un bénéfice estimé juste."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus /> Ajouter une dépense
              </Button>
            }
          />
        )}
        {rows.length > 0 && (
          <Pagination page={page} onPageChange={setPage} count={rows.length} />
        )}
      </Card>

      {editing && (
        <ExpenseDialog
          expense={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
