"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { ErrorState, InlineAlert } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { parcelNumber } from "@/features/order/order-api";
import { OrderForm } from "@/features/order/order-form";
import { TRANSITIONS } from "@/features/order/order-status";
import { useOrder } from "@/features/order/use-orders";
import { useShopId } from "@/features/shop/shop-context";

export default function EditOrderPage() {
  const shopId = useShopId();
  const { orderId } = useParams<{ orderId: string }>();
  const order = useOrder(orderId);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={`/s/${shopId}/commandes?commande=${orderId}`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Retour à la commande
        </Link>
        <PageHeader
          title={
            order.data
              ? `Modifier la commande ${parcelNumber(order.data)}`
              : "Modifier la commande"
          }
        />
      </div>
      {order.isError && (
        <ErrorState error={order.error} onRetry={() => order.refetch()} />
      )}
      {!order.data && !order.isError && (
        <Skeleton className="h-96 rounded-xl" />
      )}
      {order.data &&
        (TRANSITIONS[order.data.status].length === 0 ? (
          <InlineAlert>
            Cette commande est terminée : elle ne peut plus être modifiée.
          </InlineAlert>
        ) : (
          <OrderForm key={order.data.id} order={order.data} />
        ))}
    </>
  );
}
