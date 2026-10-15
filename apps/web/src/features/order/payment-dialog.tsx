"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatAr } from "@/lib/format";

import type { Order } from "./order-api";
import { PAYMENT_METHODS } from "./order-status";
import { useUpdateOrder } from "./use-orders";

/** "Encaisser": how the customer paid; marks the order as paid. */
export function PaymentDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateOrder(order.id);
  const [method, setMethod] = useState<string | null>(order.paymentMethod);

  const save = async () => {
    try {
      await update.mutateAsync({ isPaid: true, paymentMethod: method });
      // No confirmation before: a mistake is undone from the toast instead.
      toast.success(`${formatAr(order.totalAmount)} encaissés.`, {
        action: {
          label: "Annuler",
          onClick: () => update.mutate({ isPaid: false }),
        },
      });
      onOpenChange(false);
    } catch {
      // Shown below.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encaisser</DialogTitle>
          <DialogDescription>
            Comment le client a payé {formatAr(order.totalAmount)} ?
          </DialogDescription>
        </DialogHeader>
        {update.isError && <ErrorState error={update.error} />}
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <Button
              key={m}
              type="button"
              variant={method === m ? "default" : "outline"}
              onClick={() => setMethod(m)}
            >
              {m}
            </Button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" />}
            Marquer comme payée
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
