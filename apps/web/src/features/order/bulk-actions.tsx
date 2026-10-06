"use client";

import { Bike, Loader2, Wallet, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShopId } from "@/features/shop/shop-context";
import { apiErrorMessage } from "@/lib/api-client";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  assignDriver,
  changeOrderStatus,
  parcelNumber,
  unassignDriver,
  updateOrder,
  type Order,
} from "./order-api";
import {
  destructiveStatuses,
  ORDER_STATUSES,
  STATUS_LABELS,
  TRANSITIONS,
  type OrderStatus,
} from "./order-status";
import { useAssignDriver, useDrivers, useOrderChanged } from "./use-orders";

/**
 * Bar shown once orders are ticked in the table: give them to a driver, move their status or
 * cash them in, in one go. Orders the action does not apply to are skipped and counted.
 */
export function BulkActions({
  orders,
  onClear,
}: {
  orders: Order[];
  onClear: () => void;
}) {
  const shopId = useShopId();
  const drivers = useDrivers();
  const changed = useOrderChanged();
  const [busy, setBusy] = useState(false);

  /** Runs `action` on the orders it applies to; one toast with what was done and skipped. */
  const run = async (
    applies: (o: Order) => boolean,
    action: (o: Order) => Promise<unknown>,
    done: string,
  ) => {
    const targets = orders.filter(applies);
    const skipped = orders.length - targets.length;
    setBusy(true);
    const results = await Promise.allSettled(targets.map(action));
    setBusy(false);
    changed();
    const failed = results.filter((r) => r.status === "rejected").length;
    const ok = targets.length - failed;
    const notes = [
      skipped &&
        `${plural(skipped, "ignorée")} (non concernée${skipped > 1 ? "s" : ""})`,
      failed && `${plural(failed, "erreur")}`,
    ].filter(Boolean);
    (failed ? toast.error : toast.success)(
      `${plural(ok, "commande")} ${done}${notes.length ? ` · ${notes.join(", ")}` : ""}.`,
    );
    if (!failed) onClear();
  };

  const assign = (value: string) =>
    run(
      (o) => !!o.delivery && TRANSITIONS[o.status].length > 0,
      (o) =>
        value === "none"
          ? unassignDriver(shopId, o.id)
          : assignDriver(shopId, o.id, value),
      value === "none" ? "sans livreur" : "attribuées",
    );

  const move = (status: OrderStatus) =>
    run(
      (o) => TRANSITIONS[o.status].includes(status),
      (o) => changeOrderStatus(shopId, o.id, status),
      `passées « ${STATUS_LABELS[status]} »`,
    );

  const cashIn = () =>
    run(
      (o) => !o.isPaid && o.status !== "ANNULEE" && o.status !== "RETOUR",
      (o) => updateOrder(shopId, o.id, { isPaid: true }),
      "encaissées",
    );

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-navy/30 bg-navy-soft/60 px-4 py-2.5">
      <span className="text-sm font-semibold">
        {plural(orders.length, "commande")} sélectionnée
        {orders.length > 1 ? "s" : ""}
      </span>
      {busy && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Select value="" onValueChange={assign} disabled={busy}>
          <SelectTrigger
            className="h-8 w-48 bg-card"
            aria-label="Attribuer à un livreur"
          >
            <Bike className="text-muted-foreground" />
            <SelectValue placeholder="Attribuer à…" />
          </SelectTrigger>
          <SelectContent>
            {drivers.data?.map((d) => (
              <SelectItem key={d.userId} value={d.userId}>
                {d.name}
              </SelectItem>
            ))}
            <SelectItem value="none">Retirer le livreur</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value=""
          onValueChange={(v) => move(v as OrderStatus)}
          disabled={busy}
        >
          <SelectTrigger
            className="h-8 w-48 bg-card"
            aria-label="Changer le statut"
          >
            <SelectValue placeholder="Changer le statut…" />
          </SelectTrigger>
          <SelectContent>
            {/* Cancel and return stay one by one: they need a confirmation. */}
            {ORDER_STATUSES.filter((s) => !destructiveStatuses.includes(s)).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="bg-card"
          disabled={busy}
          onClick={cashIn}
        >
          <Wallet /> Encaisser
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          aria-label="Désélectionner"
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

/** Driver of a delivery, changed right in the table (no need to open the order). */
export function DriverCell({ order }: { order: Order }) {
  const drivers = useDrivers();
  const assign = useAssignDriver(order.id);
  if (!order.delivery || TRANSITIONS[order.status].length === 0) {
    return (
      <span className="text-muted-foreground">
        {order.driver ? (order.driver.name ?? "Livreur") : "—"}
      </span>
    );
  }
  return (
    // The row opens the order on click: the menu keeps its clicks for itself.
    <div onClick={(e) => e.stopPropagation()}>
      <Select
        value={order.driver?.userId ?? "none"}
        onValueChange={(v) =>
          assign.mutate(v === "none" ? null : v, {
            onError: (e) => toast.error(apiErrorMessage(e)),
          })
        }
        disabled={assign.isPending}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-40 border-transparent bg-transparent shadow-none hover:border-border hover:bg-card",
            !order.driver && "text-muted-foreground",
          )}
          aria-label={`Livreur de ${parcelNumber(order)}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">À prendre</SelectItem>
          {drivers.data?.map((d) => (
            <SelectItem key={d.userId} value={d.userId}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
