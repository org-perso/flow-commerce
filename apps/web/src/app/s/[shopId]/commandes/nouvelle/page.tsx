"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { PageHeader } from "@/components/app/page-header";
import { OrderForm } from "@/features/order/order-form";
import { useShopId } from "@/features/shop/shop-context";

function NewOrder() {
  const params = useSearchParams();
  return <OrderForm customerId={params.get("client") ?? undefined} />;
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
