import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark, BrandName } from "@/components/app/brand";
import { LegalFooter } from "@/components/app/legal-footer";

/** Public legal pages: readable without an account (Play Store, sign-up link). */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="size-7" />
            <BrandName />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <article className="space-y-6 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-link [&_a]:hover:underline">
          {children}
        </article>
      </main>
      <LegalFooter className="border-t py-6" />
    </div>
  );
}
