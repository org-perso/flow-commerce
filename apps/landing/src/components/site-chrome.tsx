import Link from "next/link";

import { BrandMark, BrandName } from "@/components/brand";
import { LEGAL, LEGAL_NOTICE_PATH, PRIVACY_PATH } from "@/lib/legal";
import { GooglePlayIcon } from "@/components/google-play-icon";
import { PLAY_STORE_URL, SIGN_IN_URL, SIGN_UP_URL } from "@/lib/links";

/** Page width: wide like the web app, but capped so big screens keep a readable line. */
export const container = "mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-12";

/** Button looks shared with apps/web (variants "default", "gold", "outline"). */
export const btn = {
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
  gold: "bg-gold text-on-gold font-semibold shadow-xs hover:bg-gold-hover",
  navy: "bg-navy text-white shadow-xs hover:bg-navy-raised",
  outline: "border bg-card shadow-xs hover:bg-navy-soft",
  ghostOnNavy: "border border-white/25 text-white hover:bg-white/10",
  lg: "h-11 px-6",
  sm: "h-9 px-4",
};

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
      <div className={`${container} flex h-16 items-center gap-6`}>
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark className="size-8" />
          <BrandName className="text-lg" />
        </Link>
        <nav className="hidden flex-1 items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#fonctionnalites" className="hover:text-foreground">
            Fonctionnalités
          </a>
          <a href="#equipe" className="hover:text-foreground">
            Équipe
          </a>
          <a href="#tarifs" className="hover:text-foreground">
            Tarifs
          </a>
          <a href="#questions" className="hover:text-foreground">
            Questions
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={SIGN_IN_URL}
            className={`${btn.base} ${btn.outline} ${btn.sm} hidden md:inline-flex`}
          >
            Se connecter
          </a>
          <a href={SIGN_UP_URL} className={`${btn.base} ${btn.navy} ${btn.sm}`}>
            Essayer gratuitement
          </a>
          <a
            href={PLAY_STORE_URL}
            aria-label="Télécharger l’app sur Google Play"
            className={`${btn.base} ${btn.gold} ${btn.sm} px-2.5 sm:px-4`}
          >
            <GooglePlayIcon className="size-4" />
            <span className="hidden sm:inline">Télécharger l’app</span>
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className={`${container} flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <BrandName />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <Link href={PRIVACY_PATH} className="hover:text-foreground hover:underline">
            Politique de confidentialité
          </Link>
          <Link href={LEGAL_NOTICE_PATH} className="hover:text-foreground hover:underline">
            Mentions légales
          </Link>
          <a href={`mailto:${LEGAL.email}`} className="hover:text-foreground hover:underline">
            {LEGAL.email}
          </a>
        </div>
      </div>
      <p className={`${container} pb-8 text-xs text-muted-foreground`}>
        © <CurrentYear /> {LEGAL.publisher} · {LEGAL.product}
      </p>
    </footer>
  );
}

/** Fixed at build time (the landing is static and redeployed often enough). */
async function CurrentYear() {
  "use cache";
  return new Date().getFullYear();
}
