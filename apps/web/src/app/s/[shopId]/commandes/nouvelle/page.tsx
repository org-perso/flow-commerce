"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderForm } from "@/features/order/order-form";
import { useOrder } from "@/features/order/use-orders";
import { useShopId } from "@/features/shop/shop-context";

function NewOrder() {
  const params = useSearchParams();
  // "Recommander": ?depuis=<order id> prefills the form with that order.
  const from = params.get("depuis") ?? undefined;
  const template = useOrder(from);
  if (from && !template.data) return <Skeleton className="h-96 w-full" />;
  return (
    <OrderForm
      customerId={params.get("client") ?? undefined}
      template={template.data}
    />
  );
}

export default function NewOrderPage() {
  const shopId = useShopId();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={`/s/${shopId}/commandes`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Commandes
        </Link>
        <PageHeader title="Nouvelle commande" />
      </div>
      <Suspense>
        <NewOrder />
      </Suspense>
    </>
  );
}
