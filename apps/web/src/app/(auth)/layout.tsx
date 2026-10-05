"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BrandMark, BrandName } from "@/components/app/brand";
import { LegalFooter } from "@/components/app/legal-footer";
import { FullScreenLoader } from "@/components/app/states";
import { useAuth } from "@/features/auth/auth-provider";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <FullScreenLoader />;

  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-navy p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <BrandName className="text-xl" />
        </div>
        <div className="max-w-md">
          <p className="text-3xl leading-tight font-bold">
            De la commande au bénéfice, au même endroit.
          </p>
          <p className="mt-4 text-on-navy-muted">
            Commandes, stock, clients, livraisons et équipe : gérez votre
            boutique en ligne depuis votre ordinateur, en lien avec
            l’application mobile Flow.Co.
          </p>
        </div>
        <p className="text-sm text-on-navy-muted">
          Pensé pour les vendeurs en ligne de Madagascar.
        </p>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full border-[40px] border-gold/15" />
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <BrandName className="text-lg" />
          </div>
          {children}
          <LegalFooter className="mt-10" />
        </div>
      </main>
    </div>
  );
}
