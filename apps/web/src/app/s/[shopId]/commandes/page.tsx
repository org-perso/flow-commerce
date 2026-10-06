"use client";

import { Bike, CalendarRange, Clock, Plus, ReceiptText, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Pagination } from "@/components/app/pagination";
import { SearchInput } from "@/components/app/search-input";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { PaymentBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkActions, DriverCell } from "@/features/order/bulk-actions";
import { filterQuery, SavedFilters } from "@/features/order/saved-filters";
import { NotifyDriversButton } from "@/features/order/notify-drivers-button";
import { parcelNumber, type OrderFilters } from "@/features/order/order-api";
import { OrderSheet } from "@/features/order/order-sheet";
import {
  ORDER_STATUSES,
  type OrderStatus,
} from "@/features/order/order-status";
import {
  customerName,
  isOverdue,
  phoneOf,
  placeOf,
} from "@/features/order/order-utils";
import { slotRange } from "@/features/order/time-slot";
import {
  useDrivers,
  useOrderCounts,
  useOrders,
} from "@/features/order/use-orders";
import { useShop } from "@/features/shop/shop-context";
import { colorVars, stateColorKey } from "@/features/shop/state-colors";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatAr, formatDayLabel, formatPhone } from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

type When = "aujourdhui" | "a-venir" | "toutes";
const WHEN_API: Record<When, OrderFilters["when"]> = {
  aujourdhui: "today",
  "a-venir": "upcoming",
  toutes: undefined,
};

const isStatus = (value: string | null): value is OrderStatus =>
  ORDER_STATUSES.includes(value as OrderStatus);

function WhenCard({
  label,
  hint,
  count,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  count: number | undefined;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 text-left transition-colors hover:border-navy/30",
        active && "border-navy bg-navy-soft/60 ring-1 ring-navy",
      )}
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className="tabular text-3xl font-bold">{count ?? "–"}</span>
    </button>
  );
}

function OrdersView() {
  const shop = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const urlQ = params.get("q") ?? "";
  const whenParam = params.get("quand");
  // All orders by default; "Commandes du jour" / "À venir" (KPI cards) narrow the list.
  const when: When =
    whenParam === "aujourdhui" || whenParam === "a-venir"
      ? whenParam
      : "toutes";
  const statusParam = params.get("statut");
  const status = isStatus(statusParam) ? statusParam : undefined;
  const driverId = params.get("livreur") ?? undefined;
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
    driverId,
    from,
    to,
  };
  const orders = useOrders(filters, pageOf(page));
  // KPI cards: same search, driver and dates, whatever the card selected.
  const shared = { q: filters.q, driverId, from, to };
  const counts = useOrderCounts({ when: filters.when, ...shared });
  const todayCount = useOrderCounts({ when: "today", ...shared });
  const upcomingCount = useOrderCounts({ when: "upcoming", ...shared });
  const drivers = useDrivers();
  const byStatus = counts.data?.byStatus ?? {};
  const statusTotal = status ? (byStatus[status] ?? 0) : counts.data?.total;

  const base = `/s/${shop.id}`;
  const rows = orders.data ?? [];
  // Ticked rows (current page): bulk actions bar above the table.
  const [selected, setSelected] = useState<string[]>([]);
  const selectedOrders = rows.filter((o) => selected.includes(o.id));
  const allSelected = rows.length > 0 && selectedOrders.length === rows.length;
  const hasFilters = !!(urlQ || status || driverId || from || to);

  return (
    <>
      <PageHeader
        refresh
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
        {/* Filters: search first, then status, then creation dates. */}
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Client, lieu, téléphone, n° ou produit"
            aria-label="Rechercher"
            className="w-full sm:w-72"
          />
          <Select
            value={status ?? "all"}
            onValueChange={(v) => setParams({ statut: v === "all" ? null : v })}
          >
            <SelectTrigger className="h-9 w-56" aria-label="Statut">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Tous les statuts
                {counts.data && (
                  <span className="tabular ml-auto text-muted-foreground">
                    ({counts.data.total})
                  </span>
                )}
              </SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <StatusBadge status={s} />
                  {counts.data && (
                    <span className="tabular ml-auto text-muted-foreground">
                      ({byStatus[s] ?? 0})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={driverId ?? "all"}
            onValueChange={(v) =>
              setParams({ livreur: v === "all" ? null : v })
            }
          >
            <SelectTrigger className="h-9 w-52" aria-label="Livreur">
              <Bike className="text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les livreurs</SelectItem>
              <SelectItem value="none">Sans livreur (à prendre)</SelectItem>
              {drivers.data?.map((d) => (
                <SelectItem key={d.userId} value={d.userId}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={rangeOpen ? "secondary" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setRangeOpen((v) => !v)}
          >
            {/* The day the order was taken (creation date), not its planned day. */}
            <CalendarRange /> Commandée le
          </Button>
          {rangeOpen && (
            <div className="flex items-center gap-1.5 text-sm">
              <Input
                type="date"
                aria-label="Commandes passées à partir du"
                value={from ?? ""}
                onChange={(e) => setParams({ du: e.target.value || null })}
                className="h-9 w-40"
              />
              <span className="text-muted-foreground">au</span>
              <Input
                type="date"
                aria-label="Commandes passées jusqu’au"
                value={to ?? ""}
                onChange={(e) => setParams({ au: e.target.value || null })}
                className="h-9 w-40"
              />
            </div>
          )}
          {(hasFilters || when !== "toutes") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setSearch("");
                setParams({
                  q: null,
                  statut: null,
                  du: null,
                  au: null,
                  quand: null,
                });
              }}
            >
              <X /> Effacer les filtres
            </Button>
          )}
        </div>

        <SavedFilters
          shopId={shop.id}
          current={filterQuery(params)}
          onApply={(query) => {
            setSearch(new URLSearchParams(query).get("q") ?? "");
            router.replace(`${pathname}${query ? `?${query}` : ""}`, {
              scroll: false,
            });
          }}
        />

        {/* KPI cards: a click shows only these orders, a second click shows all again. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <WhenCard
            label="Commandes du jour"
            hint="Prévues aujourd’hui, et les retards encore ouverts"
            count={todayCount.data?.total}
            active={when === "aujourdhui"}
            onClick={() =>
              setParams({ quand: when === "aujourdhui" ? null : "aujourdhui" })
            }
          />
          <WhenCard
            label="À venir"
            hint="Prévues à partir de demain"
            count={upcomingCount.data?.total}
            active={when === "a-venir"}
            onClick={() =>
              setParams({ quand: when === "a-venir" ? null : "a-venir" })
            }
          />
        </div>
      </div>

      {orders.isError && (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      )}

      {selectedOrders.length > 0 && (
        <BulkActions orders={selectedOrders} onClear={() => setSelected([])} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Tout sélectionner sur cette page"
                  checked={
                    allSelected
                      ? true
                      : selectedOrders.length > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(v) =>
                    setSelected(v === true ? rows.map((o) => o.id) : [])
                  }
                />
              </TableHead>
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
            {orders.isPending && <TableSkeletonRows columns={9} />}
            {rows.map((o) => {
              const late = isOverdue(o);
              const phone = phoneOf(o);
              const slot = slotRange(o.timeSlot);
              return (
                <TableRow
                  key={o.id}
                  data-state={o.id === openId ? "selected" : undefined}
                  // Row tinted with the status color; left stripe = payment (shop settings).
                  style={colorVars(stateColorKey(shop.statusColors, o.status))}
                  className="state-row cursor-pointer"
                  onClick={() => setParams({ commande: o.id }, false)}
                >
                  <TableCell
                    style={colorVars(
                      stateColorKey(
                        shop.statusColors,
                        o.isPaid ? "PAID" : "UNPAID",
                      ),
                    )}
                    className="state-stripe"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      aria-label={`Sélectionner ${parcelNumber(o)}`}
                      checked={selected.includes(o.id)}
                      onCheckedChange={(v) =>
                        setSelected((ids) =>
                          v === true
                            ? [...ids, o.id]
                            : ids.filter((id) => id !== o.id),
                        )
                      }
                    />
                  </TableCell>
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
                  <TableCell className="py-1">
                    <DriverCell order={o} />
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
