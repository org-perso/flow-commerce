"use client";

import { Store } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { DriverView } from "@/components/app/driver-view";
import { RequireAuth } from "@/components/app/require-auth";
import {
  EmptyState,
  ErrorState,
  FullScreenLoader,
} from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/me/use-me";
import { ShopProvider } from "@/features/shop/shop-context";
import { useShops } from "@/features/shop/use-shops";
import { rememberShop } from "@/hooks/use-local-storage";

function ShopGate({ children }: { children: ReactNode }) {
  const { shopId } = useParams<{ shopId: string }>();
  const shops = useShops();
  // First request of a new user creates them on the API side.
  useMe();
  const shop = shops.data?.find((s) => s.id === shopId);

  useEffect(() => {
    if (shop) rememberShop(shop.id);
  }, [shop]);

  if (shops.isError) {
    return (
      <div className="mx-auto max-w-md p-6 pt-24">
        <ErrorState error={shops.error} onRetry={() => shops.refetch()} />
      </div>
    );
  }
  if (!shops.data) return <FullScreenLoader />;
  if (!shop) {
    return (
      <EmptyState
        className="min-h-svh"
        icon={Store}
        title="Boutique introuvable"
        description="Vous n’en faites pas (ou plus) partie, ou le lien est incorrect."
        action={
          <Button asChild>
            <Link href="/">Revenir à mes boutiques</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ShopProvider shop={shop}>
      {shop.role === "DRIVER" ? (
        <DriverView />
      ) : (
        <AppShell>{children}</AppShell>
      )}
    </ShopProvider>
  );
}

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <ShopGate>{children}</ShopGate>
    </RequireAuth>
  );
}
