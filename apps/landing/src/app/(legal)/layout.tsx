import { SiteFooter, SiteHeader, container } from "@/components/site-chrome";

/** Public legal pages (Play Store and the apps link here). */
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className={`${container} flex-1 py-10`}>
        <article className="max-w-3xl space-y-6 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-link [&_a]:hover:underline">
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
