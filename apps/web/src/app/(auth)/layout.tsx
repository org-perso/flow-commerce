"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { BrandMark, BrandName } from "@/components/app/brand";
import { GooglePlayIcon } from "@/components/app/google-play-icon";
import { LegalFooter } from "@/components/app/legal-footer";
import { FullScreenLoader } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { env } from "@/lib/env";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) return <FullScreenLoader />;

  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-center gap-10 overflow-hidden bg-navy p-10 text-white lg:flex">
        {/* Same look as the landing page hero. */}
        <div className="relative max-w-lg">
          <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-on-navy-muted">
            Pour les vendeurs Facebook, Instagram et WhatsApp
          </p>
          <p className="text-4xl leading-tight font-bold tracking-tight">
            De la commande au bénéfice,{" "}
            <span className="text-gold">au même endroit.</span>
          </p>
          <p className="mt-4 text-on-navy-muted">
            Commandes, stock, clients, livraisons et équipe : gérez votre
            boutique depuis votre ordinateur, en lien avec l’application mobile
            Flow.Co.
          </p>
        </div>
        <div className="relative">
          <Button variant="gold" size="lg" asChild>
            <a
              href={env.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GooglePlayIcon className="size-5" />
              Télécharger gratuitement l’application
            </a>
          </Button>
          <p className="mt-6 text-sm text-on-navy-muted">
            Conçu à Madagascar, pour les vendeurs malgaches. Montants en Ariary.
          </p>
        </div>
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full border-[40px] border-gold/15" />
      </aside>
      <main className="flex items-center justify-center bg-card p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
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
