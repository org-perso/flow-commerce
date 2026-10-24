"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Store,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { BrandMark, BrandName } from "@/components/app/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { post, type AdminMe } from "./admin-api";
import { adminKeys } from "./use-admin";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/boutiques", label: "Boutiques", icon: Store },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigation admin" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/8 hover:text-white",
              active && "bg-white/12 font-semibold text-white",
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Same frame as the seller app, with an "Admin" mark so the two are never confused. */
export function AdminShell({
  admin,
  children,
}: {
  admin: AdminMe;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await post("/auth/logout").catch(() => {});
    queryClient.removeQueries({ queryKey: adminKeys.all });
    router.replace("/admin/connexion");
  };

  const sidebar = (onNavigate?: () => void) => (
    <>
      <div className="flex h-14 items-center gap-2.5 px-2">
        <BrandMark className="size-8 shrink-0 rounded-lg ring-1 ring-white/15" />
        <BrandName className="text-[17px] text-white" />
        <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-on-gold">
          Admin
        </span>
      </div>
      <Nav onNavigate={onNavigate} />
    </>
  );

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col gap-4 bg-sidebar px-3 pb-3 lg:flex">
        {sidebar()}
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="gap-4 border-0 bg-sidebar px-3 text-sidebar-foreground [&>button]:text-white"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {sidebar(() => setDrawerOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground">
            Espace admin Flow.Co
          </span>
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <UserCog /> {admin.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate">{admin.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    @{admin.username}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/compte">
                    <UserCog /> Mon compte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex w-full flex-1 flex-col gap-6 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
