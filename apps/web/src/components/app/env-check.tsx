"use client";

import type { ReactNode } from "react";

import { missingEnv } from "@/lib/env";

/** Explains the missing configuration instead of failing with an obscure error. */
export function EnvCheck({ children }: { children: ReactNode }) {
  const missing = missingEnv();
  if (missing.length === 0) return <>{children}</>;
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-lg rounded-xl border bg-card p-6">
        <h1 className="text-lg font-semibold">Configuration incomplète</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Copiez <code>.env.example</code> en <code>.env.local</code> et
          renseignez les variables suivantes (mêmes valeurs que l’application
          mobile), puis relancez le serveur :
        </p>
        <ul className="mt-3 list-inside list-disc text-sm">
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
