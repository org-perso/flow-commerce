"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Smartphone, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BrandMark, BrandName } from "@/components/app/brand";
import { Pagination } from "@/components/app/pagination";
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  TableSkeletonRows,
} from "@/components/app/states";
import { PaymentBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { signOut } from "@/features/auth/auth-service";
import { parcelLabel } from "@/features/order/order-api";
import {
  customerName,
  isOverdue,
  phoneOf,
  placeOf,
} from "@/features/order/order-utils";
import { slotRange } from "@/features/order/time-slot";
import { useOrders } from "@/features/order/use-orders";
import { useShop } from "@/features/shop/shop-context";
import { useShops } from "@/features/shop/use-shops";
import { formatAr, formatDayLabel, formatPhone } from "@/lib/format";
import { pageOf } from "@/lib/paging";
import { cn } from "@/lib/utils";

/** Drivers work in the mobile app; on the web they only see their deliveries. */
export function DriverView() {
  const shop = useShop();
  const shops = useShops();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const orders = useOrders({ assignment: "mine" }, pageOf(page));
  const otherShops = (shops.data ?? []).filter((s) => s.id !== shop.id);

  return (
    <div className="min-h-svh">
      <header className="flex h-14 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <BrandName className="text-lg" />
          <span className="ml-2 text-sm text-muted-foreground">
            · {shop.name}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut(queryClient)}>
          <LogOut /> Se déconnecter
        </Button>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <InlineAlert tone="info" icon={Smartphone}>
          <strong>Les livreurs utilisent l’application mobile Flow.Co</strong>{" "}
          pour prendre, livrer et encaisser leurs commandes. Ici, vos livraisons
          sont en lecture seule.
        </InlineAlert>
        {otherShops.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Autres boutiques :{" "}
            {otherShops.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                <Link
                  href={`/s/${s.id}`}
                  className="font-medium text-link hover:underline"
                >
                  {s.name}
                </Link>
              </span>
            ))}
          </p>
        )}
        <h1 className="text-2xl font-bold">Mes livraisons</h1>
        {orders.isError && (
          <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
        )}
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colis</TableHead>
                <TableHead>Date et créneau</TableHead>
                <TableHead>Lieu</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.isPending && <TableSkeletonRows columns={7} rows={5} />}
              {orders.data?.map((o) => {
                const phone = phoneOf(o);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-semibold text-link">
                      {parcelLabel(o)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        isOverdue(o) && "font-semibold text-danger",
                      )}
                    >
                      {formatDayLabel(o.scheduledDate)}
                      {slotRange(o.timeSlot)
                        ? ` · ${slotRange(o.timeSlot)}`
                        : ""}
                    </TableCell>
                    <TableCell>{placeOf(o)}</TableCell>
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
                    <TableCell className="tabular text-right font-semibold">
                      {formatAr(o.totalAmount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {orders.data?.length === 0 && (
            <EmptyState
              icon={Truck}
              title="Aucune livraison"
              description="Les livraisons qui vous sont confiées apparaîtront ici."
            />
          )}
          {orders.data && orders.data.length > 0 && (
            <Pagination
              page={page}
              onPageChange={setPage}
              count={orders.data.length}
            />
          )}
        </Card>
      </main>
    </div>
  );
}
