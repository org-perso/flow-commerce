import Link from "next/link";

import { LEGAL, LEGAL_NOTICE_PATH, PRIVACY_PATH } from "@/features/legal/legal";
import { cn } from "@/lib/utils";

/** © line and links to the legal pages, at the bottom of every page. */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>
        © {new Date().getFullYear()} {LEGAL.publisher} · {LEGAL.product}
      </span>
      <span aria-hidden>·</span>
      <Link
        href={PRIVACY_PATH}
        className="hover:text-foreground hover:underline"
      >
        Politique de confidentialité
      </Link>
      <span aria-hidden>·</span>
      <Link
        href={LEGAL_NOTICE_PATH}
        className="hover:text-foreground hover:underline"
      >
        Mentions légales
      </Link>
    </footer>
  );
}
