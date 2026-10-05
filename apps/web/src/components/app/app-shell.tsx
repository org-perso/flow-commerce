"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  CircleHelp,
  ExternalLink,
  Keyboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Avatar } from "@/components/app/avatar";
import { BrandMark, BrandName } from "@/components/app/brand";
import { LegalFooter } from "@/components/app/legal-footer";
import { NAV_ITEMS, type NavItem } from "@/components/app/nav";
import { SearchInput } from "@/components/app/search-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/features/auth/auth-provider";
import { signOut } from "@/features/auth/auth-service";
import { EmailVerificationBanner } from "@/features/auth/email-verification-banner";
import { PRIVACY_POLICY_URL } from "@/features/auth/terms";
import { useStockSummary } from "@/features/product/use-products";
import { can, ROLE_LABELS } from "@/features/shop/roles";
import { useCan, useShop } from "@/features/shop/shop-context";
import { useShops } from "@/features/shop/use-shops";
import { THEME_LABELS, useTheme } from "@/features/theme/theme";
import { useHotkey } from "@/hooks/use-hotkey";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn } from "@/lib/utils";

function useNavItems(): NavItem[] {
  const shop = useShop();
  return NAV_ITEMS.filter(
    (item) => !item.permission || can(shop.role, item.permission),
  );
}

function isActive(pathname: string, base: string, item: NavItem) {
  const href = `${base}${item.path}`;
  return item.path === "" ? pathname === base : pathname.startsWith(href);
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const shop = useShop();
  const pathname = usePathname();
  const items = useNavItems();
  const base = `/s/${shop.id}`;
  const canStock = useCan("catalog.read");
  const lowStock = useStockSummary();
  const lowStockCount = canStock ? (lowStock.data?.lowStockCount ?? 0) : 0;

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(pathname, base, item);
        const badge =
          item.path === "/stock" && lowStockCount > 0 ? lowStockCount : null;
        const link = (
          <Link
            key={item.path}
            href={`${base}${item.path}`}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/8 hover:text-white",
              active && "bg-white/12 font-semibold text-white",
              collapsed && "justify-center px-0",
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            {!collapsed && (
              <span className="flex-1 truncate">{item.label}</span>
            )}
            {!collapsed && badge && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-on-gold"
                title={`${badge} produit(s) en stock faible`}
              >
                {badge}
              </span>
            )}
          </Link>
        );
        return collapsed ? (
          <Tooltip key={item.path}>
            <TooltipTrigger asChild>{link}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ) : (
          link
        );
      })}
    </nav>
  );
}

function ShopSwitcher({ compact = false }: { compact?: boolean }) {
  const shop = useShop();
  const shops = useShops();
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 max-w-64 items-center gap-2 rounded-md border bg-card px-2 text-left text-sm shadow-xs hover:bg-accent"
          aria-label={`Boutique ${shop.name}, changer de boutique`}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-gold text-[11px] font-bold text-on-gold">
            {shop.name.slice(0, 1).toUpperCase()}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-semibold",
              compact && "hidden sm:inline",
            )}
          >
            {shop.name}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Mes boutiques</DropdownMenuLabel>
        {shops.data?.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onSelect={() => router.push(`/s/${s.id}`)}
            className="gap-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-navy-soft text-xs font-bold text-navy">
              {s.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[s.role]}
              </span>
            </span>
            {s.id === shop.id && <Check className="text-foreground!" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/bienvenue")}>
          <Plus /> Créer ou rejoindre une boutique
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu({ onShortcuts }: { onShortcuts: () => void }) {
  const [theme, setTheme] = useTheme();
  const { user } = useAuth();
  const shop = useShop();
  const queryClient = useQueryClient();
  const router = useRouter();
  const name = shop.nickname || user?.displayName || user?.email || "Moi";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
          aria-label="Menu du compte"
        >
          <Avatar name={name} className="size-9 bg-navy text-white" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user?.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ROLE_LABELS[shop.role]} · {shop.name}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push(`/s/${shop.id}/parametres`)}
        >
          <Settings /> Paramètres
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShortcuts}>
          <Keyboard /> Raccourcis clavier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Apparence</DropdownMenuLabel>
        {(["light", "dark", "system"] as const).map((value) => {
          const Icon =
            value === "light" ? Sun : value === "dark" ? Moon : Monitor;
          return (
            <DropdownMenuItem
              key={value}
              // Stays open: the change is visible at once.
              onSelect={(e) => {
                e.preventDefault();
                setTheme(value);
              }}
            >
              <Icon /> {THEME_LABELS[value]}
              {theme === value && <Check className="ml-auto" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem asChild>
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
            <ExternalLink /> Politique de confidentialité
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => signOut(queryClient)}
        >
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["N"], label: "Nouvelle commande" },
  { keys: ["/"], label: "Rechercher une commande" },
  { keys: ["G", "D"], label: "Tableau de bord" },
  { keys: ["G", "C"], label: "Commandes" },
  { keys: ["G", "L"], label: "Livraisons" },
  { keys: ["G", "S"], label: "Stock" },
  { keys: ["G", "K"], label: "Clients" },
  { keys: ["G", "E"], label: "Dépenses" },
  { keys: ["G", "Q"], label: "Équipe" },
  { keys: ["G", "P"], label: "Paramètres" },
  { keys: ["?"], label: "Afficher cette aide" },
];

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
          <DialogDescription>
            Actifs partout, sauf pendant la saisie dans un champ.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y text-sm">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between py-2"
            >
              <span>{s.label}</span>
              <span className="flex gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="min-w-6 rounded border bg-muted px-1.5 py-0.5 text-center font-mono text-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** "g" then a letter jumps to a section (like Linear / GitHub). */
function useGoToShortcuts(base: string, items: NavItem[]) {
  const router = useRouter();
  const pendingG = useRef(0);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (
        el &&
        (el.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "g") {
        pendingG.current = Date.now();
        return;
      }
      if (Date.now() - pendingG.current < 1200) {
        const item = items.find((i) => i.key === key);
        pendingG.current = 0;
        if (item) {
          event.preventDefault();
          router.push(`${base}${item.path}`);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [base, items, router]);
}

export function AppShell({ children }: { children: ReactNode }) {
  const shop = useShop();
  const router = useRouter();
  const base = `/s/${shop.id}`;
  const items = useNavItems();
  const canOrders = useCan("orders");
  const [collapsedValue, setCollapsed] = useLocalStorage(
    "flowco:sidebar-collapsed",
    "0",
  );
  const collapsed = collapsedValue === "1";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useGoToShortcuts(base, items);
  useHotkey("/", () => searchRef.current?.focus());
  useHotkey("?", () => setShortcutsOpen(true));
  useHotkey("n", () => router.push(`${base}/commandes/nouvelle`), canOrders);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = search.trim();
    router.push(`${base}/commandes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    searchRef.current?.blur();
  };

  const sidebarBody = (isCollapsed: boolean, onNavigate?: () => void) => (
    <>
      <div
        className={cn(
          "flex h-14 items-center gap-2.5 px-2",
          isCollapsed && "justify-center px-0",
        )}
      >
        <BrandMark className="size-8 shrink-0 ring-1 ring-white/15 rounded-lg" />
        {!isCollapsed && <BrandName className="text-[17px] text-white" />}
      </div>
      <SidebarNav collapsed={isCollapsed} onNavigate={onNavigate} />
    </>
  );

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col gap-4 bg-sidebar px-3 pb-3 transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        {sidebarBody(collapsed)}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setCollapsed(collapsed ? "0" : "1")}
          className={cn(
            "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-sidebar-foreground hover:bg-white/8 hover:text-white",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" />
          ) : (
            <PanelLeftClose className="size-[18px]" />
          )}
          {!collapsed && "Replier le menu"}
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="gap-4 border-0 bg-sidebar px-3 text-sidebar-foreground [&>button]:text-white"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {sidebarBody(false, () => setDrawerOpen(false))}
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
          <ShopSwitcher compact />
          <form
            onSubmit={submitSearch}
            className="ml-auto hidden max-w-md flex-1 md:block lg:ml-4"
          >
            <SearchInput
              ref={searchRef}
              value={search}
              onValueChange={setSearch}
              placeholder="Rechercher une commande (client, n°, produit)…"
              aria-label="Rechercher une commande"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            {/* Who I am in this shop: the role decides what the screens show. */}
            <span
              className="hidden items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground sm:inline-flex"
              title={`Votre rôle dans ${shop.name}`}
            >
              <UserRound className="size-3.5" />
              {ROLE_LABELS[shop.role]}
            </span>
            {canOrders && (
              <Button variant="gold" size="sm" asChild>
                <Link
                  href={`${base}/commandes/nouvelle`}
                  title="Nouvelle commande (N)"
                >
                  <Plus />{" "}
                  <span className="hidden sm:inline">Nouvelle commande</span>
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShortcutsOpen(true)}
              aria-label="Raccourcis clavier"
            >
              <CircleHelp />
            </Button>
            <AccountMenu onShortcuts={() => setShortcutsOpen(true)} />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 p-4 lg:p-6">
          <EmailVerificationBanner />
          {children}
        </main>
        <LegalFooter className="pb-4" />
      </div>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
