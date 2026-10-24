"use client";

import { CreditCard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopId } from "@/features/shop/shop-context";

import { planSummary, useSubscription } from "./subscription";

/** The current plan, in the shop settings, with a link to manage it. */
export function PlanSummaryCard() {
  const shopId = useShopId();
  const subscription = useSubscription();
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Abonnement</CardTitle>
        <CardDescription>
          Votre formule Flow.Co et ses paiements.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        {subscription.data ? (
          <p className="font-semibold">{planSummary(subscription.data)}</p>
        ) : (
          <Skeleton className="h-5 w-56" />
        )}
        <Button variant="outline" asChild>
          <Link href={`/s/${shopId}/abonnement`}>
            <CreditCard /> Gérer l’abonnement
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
