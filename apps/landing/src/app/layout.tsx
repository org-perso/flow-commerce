import type { Metadata } from "next";
import localFont from "next/font/local";

import "./globals.css";

// Inter (variable, SIL OFL), same files as apps/web.
const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    { path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/inter-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://flow-commerce.com",
  ),
  title: {
    default: "Flow.Co - Gestion des ventes en ligne à Madagascar",
    template: "%s · Flow.Co",
  },
  description:
    "Commandes, stock, livraisons et bénéfice : Flow.Co rassemble la gestion des vendeurs Facebook, Instagram et WhatsApp dans une seule app.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Flow.Co",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og-image.png"] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="flex min-h-svh flex-col">{children}</body>
    </html>
  );
}
