"use client";

import {
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Segmented } from "@/components/app/segmented";
import { EmptyState, ErrorState, InlineAlert } from "@/components/app/states";
import { PaymentBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotifyDriversButton } from "@/features/order/notify-drivers-button";
import { parcelLabel, type Order } from "@/features/order/order-api";
import { OrderSheet } from "@/features/order/order-sheet";
import { OPEN_STATUSES } from "@/features/order/order-status";
import { customerName, isOverdue, phoneOf } from "@/features/order/order-utils";
import { momentOf, placeKey } from "@/features/order/round";
import { byPlannedTime, slotRange } from "@/features/order/time-slot";
import { useDrivers, useOrders } from "@/features/order/use-orders";
import {
  businessToday,
  formatAr,
  formatDayLabel,
  formatPhone,
  plural,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const MOMENT_ORDER = [
  "Ce matin",
  "Midi",
  "Cet après-midi",
  "Ce soir",
  "Sans créneau",
];
const MAX_ROWS = 200;

type Group = { title: string; tone?: "danger"; orders: Order[] };

/** Late first, then by moment of the day, then by place (same place together). */
function groupDeliveries(
  orders: Order[],
  today: string,
  upcoming: boolean,
): Group[] {
  const groups = new Map<string, Group>();
  const late = orders.filter((o) => isOverdue(o, today)).sort(byPlannedTime);
  const result: Group[] = late.length
    ? [{ title: "En retard", tone: "danger", orders: late }]
    : [];
  orders
    .filter((o) => !isOverdue(o, today))
    .sort(
      (a, b) =>
        (upcoming ? a.scheduledDate.localeCompare(b.scheduledDate) : 0) ||
        MOMENT_ORDER.indexOf(momentOf(a.timeSlot)) -
          MOMENT_ORDER.indexOf(momentOf(b.timeSlot)) ||
        (placeKey(a) || "￿").localeCompare(placeKey(b) || "￿") ||
        byPlannedTime(a, b),
    )
    .forEach((order) => {
      const day = upcoming
        ? `${formatDayLabel(order.scheduledDate, today)} · `
        : "";
      const place = order.delivery?.place?.trim() || "Lieu non précisé";
      const key = `${order.scheduledDate}|${momentOf(order.timeSlot)}|${placeKey(order)}`;
      const group = groups.get(key) ?? {
        title: `${day}${momentOf(order.timeSlot)} · ${place}`,
        orders: [],
      };
      group.orders.push(order);
      groups.set(key, group);
    });
  return [...result, ...groups.values()];
}

function DeliveryCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  const phone = phoneOf(order);
  const slot = slotRange(order.timeSlot);
  const late = isOverdue(order);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-navy/30 hover:bg-navy-soft/30"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-link">
          {parcelLabel(order)}
        </span>
        <span className="tabular text-sm font-semibold">
          {formatAr(order.totalAmount)}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 text-sm">
        <span className="font-medium">{customerName(order)}</span>
        {phone && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="size-3" /> {formatPhone(phone)}
          </span>
        )}
        {order.delivery?.address && (
          <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" /> {order.delivery.address}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={order.status} />
        <PaymentBadge isPaid={order.isPaid} />
        {(slot || late) && (
          <span
            className={cn(
              "ml-auto flex items-center gap-1 text-xs",
              late ? "font-semibold text-danger" : "text-muted-foreground",
            )}
          >
            <Clock className="size-3" />
            {late && order.scheduledDate < businessToday()
              ? formatDayLabel(order.scheduledDate)
              : slot}
          </span>
        )}
      </div>
    </button>
  );
}

function Column({
  title,
  subtitle,
  orders,
  today,
  upcoming,
  onOpen,
  highlight,
}: {
  title: string;
  subtitle: string;
  orders: Order[];
  today: string;
  upcoming: boolean;
  onOpen: (id: string) => void;
  highlight?: boolean;
}) {
  const groups = groupDeliveries(orders, today, upcoming);
  const total = orders.reduce(
    (sum, o) => sum + (o.isPaid ? 0 : o.totalAmount),
    0,
  );
  return (
    <section
      className={cn(
        "flex w-80 shrink-0 flex-col gap-3 rounded-xl border bg-muted/50 p-3",
        highlight && "border-gold/60 bg-gold-soft/50",
      )}
    >
      <header className="flex items-center gap-2.5 px-1">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            highlight ? "bg-gold text-on-gold" : "bg-navy text-white",
          )}
        >
          {highlight ? (
            <Truck className="size-4" />
          ) : (
            <UserRound className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="tabular flex h-6 min-w-6 items-center justify-center rounded-full bg-card px-2 text-xs font-bold">
          {orders.length}
        </span>
      </header>
      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          Aucune livraison
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-2">
            <h3
              className={cn(
                "px-1 text-[11px] font-bold tracking-wider uppercase",
                group.tone === "danger"
                  ? "text-danger"
                  : "text-muted-foreground",
              )}
            >
              {group.title} · {group.orders.length}
            </h3>
            {group.orders.map((o) => (
              <DeliveryCard key={o.id} order={o} onOpen={() => onOpen(o.id)} />
            ))}
          </div>
        ))
      )}
      {total > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          À encaisser : {formatAr(total)}
        </p>
      )}
    </section>
  );
}

export default function DeliveriesPage() {
  const [when, setWhen] = useState<"today" | "upcoming">("today");
  const [openId, setOpenId] = useState<string | null>(null);
  const orders = useOrders({ when }, { limit: MAX_ROWS, offset: 0 });
  const drivers = useDrivers();
  const today = businessToday();

  const deliveries = (orders.data ?? []).filter(
    (o) => o.delivery && OPEN_STATUSES.includes(o.status),
  );
  const available = deliveries.filter((o) => !o.driver);
  const byDriver = new Map<string, { name: string; orders: Order[] }>();
  for (const d of drivers.data ?? [])
    byDriver.set(d.userId, { name: d.name, orders: [] });
  for (const o of deliveries) {
    if (!o.driver) continue;
    const entry = byDriver.get(o.driver.userId) ?? {
      name: o.driver.name ?? "Livreur",
      orders: [],
    };
    entry.orders.push(o);
    byDriver.set(o.driver.userId, entry);
  }
  const loading = orders.isPending || drivers.isPending;

  return (
    <>
      <PageHeader
        title="Livraisons"
        description={
          orders.data
            ? `${plural(deliveries.length, "livraison")} en cours · ${available.length} à prendre`
            : undefined
        }
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => orders.refetch()}
              disabled={orders.isFetching}
            >
              <RefreshCw className={cn(orders.isFetching && "animate-spin")} />{" "}
              Actualiser
            </Button>
            <NotifyDriversButton />
          </>
        }
      />
      <div className="flex items-center gap-3">
        <Segmented
          label="Jour"
          value={when}
          onChange={setWhen}
          options={[
            { value: "today", label: "Aujourd'hui et en retard" },
            { value: "upcoming", label: "À venir" },
          ]}
        />
      </div>
      {orders.isError && (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      )}
      {orders.data?.length === MAX_ROWS && (
        <InlineAlert tone="info">
          Seules les {MAX_ROWS} premières commandes sont affichées. Utilisez la
          page Commandes pour le reste.
        </InlineAlert>
      )}
      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-96 w-80 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : deliveries.length === 0 && byDriver.size === 0 ? (
        <EmptyState
          icon={Truck}
          title="Aucune livraison en cours"
          description="Les commandes « Livraison » non terminées apparaissent ici, par livreur et à prendre."
        />
      ) : (
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 lg:-mx-6 lg:px-6">
          <Column
            title="À prendre"
            subtitle="Aucun livreur assigné"
            orders={available}
            today={today}
            upcoming={when === "upcoming"}
            onOpen={setOpenId}
            highlight
          />
          {[...byDriver.entries()].map(([userId, d]) => (
            <Column
              key={userId}
              title={d.name}
              subtitle={plural(d.orders.length, "livraison")}
              orders={d.orders}
              today={today}
              upcoming={when === "upcoming"}
              onOpen={setOpenId}
            />
          ))}
        </div>
      )}
      <OrderSheet orderId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
