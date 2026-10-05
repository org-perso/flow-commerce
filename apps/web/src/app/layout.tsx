import type { Metadata } from "next";
import localFont from "next/font/local";

import { EnvCheck } from "@/components/app/env-check";
import { Providers } from "@/components/providers";
import { THEME_SCRIPT } from "@/features/theme/theme";

import "./globals.css";

// Inter (variable, SIL OFL) served from the app itself: no request to Google Fonts at build time.
const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    { path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" },
    {
      path: "./fonts/inter-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: { default: "Flow.Co", template: "%s · Flow.Co" },
  description:
    "Commandes, stock, clients et livraisons : la gestion des vendeurs en ligne à Madagascar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The theme script sets the "dark" class before React: hence suppressHydrationWarning.
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <EnvCheck>{children}</EnvCheck>
        </Providers>
      </body>
    </html>
  );
}
