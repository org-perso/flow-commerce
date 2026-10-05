"use client";

import { CalendarRange, Clock, Plus, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SearchInput } from "@/components/app/search-input";
import { Segmented } from "@/components/app/segmented";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { PaymentBadge, StatusBadge } from "@/components/app/status-badge";
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
import { NotifyDriversButton } from "@/features/order/notify-drivers-button";
import { parcelNumber, type OrderFilters } from "@/features/order/order-api";
import { OrderSheet } from "@/features/order/order-sheet";
import {
  ORDER_STATUSES,
  STATUS_LABELS,
  type OrderStatus,
} from "@/features/order/order-status";
import {
  customerName,
  isOverdue,
  phoneOf,
  placeOf,
} from "@/features/order/order-utils";
import { slotRange } from "@/features/order/time-slot";
import { useOrderCounts, useOrders } from "@/features/order/use-orders";
import { useShop } from "@/features/shop/shop-context";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatAr, formatDayLabel, formatPhone } from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

type When = "aujourdhui" | "a-venir" | "toutes";
const WHEN_OPTIONS = [
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "a-venir", label: "À venir" },
  { value: "toutes", label: "Toutes" },
] as const;
const WHEN_API: Record<When, OrderFilters["when"]> = {
  aujourdhui: "today",
  "a-venir": "upcoming",
  toutes: undefined,
};

const isStatus = (value: string | null): value is OrderStatus =>
  ORDER_STATUSES.includes(value as OrderStatus);

function OrdersView() {
  const shop = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const urlQ = params.get("q") ?? "";
  const whenParam = params.get("quand");
  const when: When =
    whenParam === "a-venir" || whenParam === "toutes"
      ? whenParam
      : urlQ
        ? "toutes"
        : "aujourdhui";
  const statusParam = params.get("statut");
  const status = isStatus(statusParam) ? statusParam : undefined;
  const from = params.get("du") ?? undefined;
  const to = params.get("au") ?? undefined;
  const page = Math.max(0, Number(params.get("p") ?? 0) || 0);
  const openId = params.get("commande");

  const setParams = (
    changes: Record<string, string | null>,
    resetPage = true,
  ) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage && !("p" in changes)) next.delete("p");
    const text = next.toString();
    router.replace(`${pathname}${text ? `?${text}` : ""}`, { scroll: false });
  };

  // Search field: local while typing, in the URL once settled (also filled from the top bar).
  const [search, setSearch] = useState(urlQ);
  const [seenQ, setSeenQ] = useState(urlQ);
  const debounced = useDebouncedValue(search.trim(), 350);
  if (urlQ !== seenQ) {
    setSeenQ(urlQ);
    if (urlQ !== debounced) setSearch(urlQ);
  }
  useEffect(() => {
    if (debounced !== urlQ) setParams({ q: debounced || null });
    // setParams is rebuilt each render; only the debounced text matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const [rangeOpen, setRangeOpen] = useState(!!(from || to));
  const filters: OrderFilters = {
    when: WHEN_API[when],
    q: urlQ || undefined,
    status,
    from,
    to,
  };
  const orders = useOrders(filters, pageOf(page));
  const counts = useOrderCounts({ when: filters.when, q: filters.q, from, to });
  const byStatus = counts.data?.byStatus ?? {};
  const statusTotal = status ? (byStatus[status] ?? 0) : counts.data?.total;

  const base = `/s/${shop.id}`;
  const rows = orders.data ?? [];
  const hasFilters = !!(urlQ || status || from || to);

  return (
    <>
      <PageHeader
        title="Commandes"
        description={
          counts.data
            ? `${counts.data.total} commande${counts.data.total > 1 ? "s" : ""}`
            : undefined
        }
        actions={
          <>
            <NotifyDriversButton />
            <Button variant="gold" asChild>
              <Link href={`${base}/commandes/nouvelle`}>
                <Plus /> Nouvelle commande
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Date"
            value={when}
            onChange={(v) => setParams({ quand: v })}
            options={WHEN_OPTIONS}
          />
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Client, téléphone, n° ou produit"
            aria-label="Rechercher"
            className="w-full sm:w-72"
          />
          <Button
            variant={rangeOpen ? "secondary" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setRangeOpen((v) => !v)}
          >
            {/* The API filters on the creation date of the order, not its planned day. */}
            <CalendarRange /> Créées entre
          </Button>
          {rangeOpen && (
            <div className="flex items-center gap-1.5 text-sm">
              <Input
                type="date"
                aria-label="Créées à partir du"
                value={from ?? ""}
                onChange={(e) => setParams({ du: e.target.value || null })}
                className="h-9 w-40"
              />
              <span className="text-muted-foreground">au</span>
              <Input
                type="date"
                aria-label="Créées jusqu’au"
                value={to ?? ""}
                onChange={(e) => setParams({ au: e.target.value || null })}
                className="h-9 w-40"
              />
            </div>
          )}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch("");
                setParams({ q: null, statut: null, du: null, au: null });
              }}
            >
              <X /> Effacer les filtres
            </Button>
          )}
        </div>

        <nav
          aria-label="Statut"
          className="flex gap-1 overflow-x-auto border-b"
        >
          {[undefined, ...ORDER_STATUSES].map((s) => {
            const active = s === status;
            const count = s ? (byStatus[s] ?? 0) : counts.data?.total;
            return (
              <button
                key={s ?? "all"}
                type="button"
                onClick={() => setParams({ statut: s ?? null })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "-mb-px flex h-10 items-center gap-2 border-b-2 px-2.5 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "border-navy font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {s ? STATUS_LABELS[s] : "Toutes"}
                {count !== undefined && (
                  <span
                    className={cn(
                      "tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      active ? "bg-navy text-white" : "bg-navy-soft text-navy",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {orders.isError && (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colis</TableHead>
              <TableHead>Lieu</TableHead>
              <TableHead>Date et créneau</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead>Livreur</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={cn(orders.isPlaceholderData && "opacity-60")}>
            {orders.isPending && <TableSkeletonRows columns={8} />}
            {rows.map((o) => {
              const late = isOverdue(o);
              const phone = phoneOf(o);
              const slot = slotRange(o.timeSlot);
              return (
                <TableRow
                  key={o.id}
                  data-state={o.id === openId ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => setParams({ commande: o.id }, false)}
                >
                  <TableCell>
                    <button
                      type="button"
                      className="font-semibold text-link hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setParams({ commande: o.id }, false);
                      }}
                    >
                      {parcelNumber(o)}
                    </button>
                  </TableCell>
                  <TableCell
                    className={cn(!o.delivery && "text-muted-foreground")}
                  >
                    {placeOf(o)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5",
                        late && "font-semibold text-danger",
                      )}
                    >
                      {late && <Clock className="size-3.5" />}
                      {formatDayLabel(o.scheduledDate)}
                      {slot && (
                        <span className={cn(!late && "text-muted-foreground")}>
                          · {slot}
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{customerName(o)}</span>
                      {phone && (
                        <span className="text-xs text-muted-foreground">
                          {formatPhone(phone)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge isPaid={o.isPaid} />
                  </TableCell>
                  <TableCell
                    className={cn(!o.driver && "text-muted-foreground")}
                  >
                    {o.driver
                      ? (o.driver.name ?? "Livreur")
                      : o.delivery
                        ? "À prendre"
                        : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right font-semibold">
                    {formatAr(o.totalAmount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {orders.isSuccess && rows.length === 0 && (
          <EmptyState
            icon={ReceiptText}
            title={
              hasFilters
                ? "Aucune commande ne correspond"
                : when === "aujourdhui"
                  ? "Rien de prévu aujourd’hui"
                  : "Aucune commande"
            }
            description={
              hasFilters
                ? "Modifiez la recherche ou les filtres."
                : "Les nouvelles commandes apparaîtront ici."
            }
            action={
              !hasFilters ? (
                <Button variant="gold" asChild>
                  <Link href={`${base}/commandes/nouvelle`}>
                    <Plus /> Nouvelle commande
                  </Link>
                </Button>
              ) : undefined
            }
          />
        )}
        {rows.length > 0 && (
          <Pagination
            page={page}
            onPageChange={(p) => setParams({ p: p ? String(p) : null }, false)}
            count={rows.length}
            total={statusTotal}
          />
        )}
      </Card>

      <OrderSheet
        orderId={openId}
        onClose={() => setParams({ commande: null }, false)}
      />
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersView />
    </Suspense>
  );
}
