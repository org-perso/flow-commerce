"use client";

import { ArrowLeft, KeyRound, LogOut, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { BrandMark, BrandName } from "@/components/app/brand";
import { RequireAuth } from "@/components/app/require-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-provider";
import { signOut } from "@/features/auth/auth-service";
import { ShopForm } from "@/features/shop/shop-form";
import { useCreateShop, useShops } from "@/features/shop/use-shops";
import { JoinForm } from "@/features/team/join-form";
import { rememberShop } from "@/hooks/use-local-storage";

function Onboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const shops = useShops();
  const createShop = useCreateShop();
  const hasShops = (shops.data?.length ?? 0) > 0;

  const open = (shopId: string) => {
    rememberShop(shopId);
    router.push(`/s/${shopId}`);
  };

  return (
    <div className="min-h-svh">
      <header className="flex h-16 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <BrandName className="text-lg" />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut(queryClient)}
          >
            <LogOut /> Se déconnecter
          </Button>
        </div>
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-12">
        {hasShops && (
          <Link
            href="/"
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Retour à mes boutiques
          </Link>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {hasShops ? "Ajouter une boutique" : "Bienvenue sur Flow.Co"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {hasShops
              ? "Créez une autre boutique, ou rejoignez celle d’une autre équipe."
              : "Pour commencer, créez votre boutique ou rejoignez une équipe avec le code reçu."}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex-col items-start">
              <span className="flex size-10 items-center justify-center rounded-lg bg-gold-soft text-gold-ink">
                <Store className="size-5" />
              </span>
              <CardTitle className="mt-2">Créer une boutique</CardTitle>
              <CardDescription>
                Vous en serez le propriétaire et pourrez inviter votre équipe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShopForm
                submitLabel="Créer la boutique"
                error={createShop.error}
                onSubmit={async (input) =>
                  open((await createShop.mutateAsync(input)).id)
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-col items-start">
              <span className="flex size-10 items-center justify-center rounded-lg bg-navy-soft text-navy">
                <KeyRound className="size-5" />
              </span>
              <CardTitle className="mt-2">Rejoindre avec un code</CardTitle>
              <CardDescription>
                Le propriétaire ou le gérant vous a envoyé un code de 6
                caractères.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JoinForm onJoined={(shop) => open(shop.id)} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  );
}
