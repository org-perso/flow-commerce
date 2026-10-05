"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ErrorState, FullScreenLoader } from "@/components/app/states";
import { useAuth } from "@/features/auth/auth-provider";
import { useShops } from "@/features/shop/use-shops";
import { lastShop } from "@/hooks/use-local-storage";

/** Entry point: sign-in, the last shop opened, or onboarding when there is no shop. */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const shops = useShops(!!user);

  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/connexion");
    if (!shops.data) return;
    if (shops.data.length === 0) return router.replace("/bienvenue");
    const remembered = lastShop();
    const target =
      shops.data.find((s) => s.id === remembered) ?? shops.data[0]!;
    router.replace(`/s/${target.id}`);
  }, [loading, user, shops.data, router]);

  if (shops.isError) {
    return (
      <div className="mx-auto max-w-md p-6 pt-24">
        <ErrorState error={shops.error} onRetry={() => shops.refetch()} />
      </div>
    );
  }
  return <FullScreenLoader label="Ouverture de votre boutique…" />;
}
