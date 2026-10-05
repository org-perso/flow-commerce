"use client";

import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api-client";
import { plural } from "@/lib/format";

import { useDeliveriesToNotify, useNotifyDrivers } from "./use-orders";

/** "Notifier les livreurs (N)": one grouped notification per driver for the new deliveries. */
export function NotifyDriversButton() {
  const toNotify = useDeliveriesToNotify();
  const notify = useNotifyDrivers();
  const count = toNotify.data?.orders ?? 0;

  const onClick = async () => {
    try {
      const result = await notify.mutateAsync();
      toast.success(
        result.drivers > 0
          ? `${plural(result.drivers, "livreur notifié", "livreurs notifiés")} pour ${plural(result.orders, "livraison")}.`
          : "Aucun livreur à notifier.",
      );
    } catch (error) {
      toast.error(apiErrorMessage(error));
    }
  };

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={count === 0 || notify.isPending}
      title={
        count === 0
          ? "Aucune nouvelle livraison à signaler"
          : `${plural(count, "livraison")} pour ${plural(toNotify.data?.drivers ?? 0, "livreur")}`
      }
    >
      {notify.isPending ? <Loader2 className="animate-spin" /> : <BellRing />}
      Notifier les livreurs ({count})
    </Button>
  );
}
