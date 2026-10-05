"use client";

import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  Package,
  ReceiptText,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import { Segmented } from "@/components/app/segmented";
import { EmptyState, ErrorState } from "@/components/app/states";
import { PaymentBadge, StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Dashboard,
  DashboardPeriod,
} from "@/features/dashboard/dashboard-api";
import { useDashboard } from "@/features/dashboard/use-dashboard";
import { parcelNumber } from "@/features/order/order-api";
import {
  OPEN_STATUSES,
  STATUS_CLASSES,
  STATUS_LABELS,
} from "@/features/order/order-status";
import { customerName } from "@/features/order/order-utils";
import { useCan, useShop } from "@/features/shop/shop-context";
import {
  formatAr,
  formatDayLabel,
  formatLongDate,
  formatRelative,
  plural,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
] as const;

const PERIOD_CAPTION: Record<DashboardPeriod, string> = {
  today: "aujourd’hui",
  "7d": "sur 7 jours",
  "30d": "sur 30 jours",
};

function Kpi({
  label,
  value,
  caption,
  icon: Icon,
  hero,
}: {
  label: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  hero?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border p-5",
        hero ? "border-transparent bg-navy text-white" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium",
            hero ? "text-on-navy-muted" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <Icon
          className={cn("size-4", hero ? "text-gold" : "text-muted-foreground")}
        />
      </div>
      <span className="tabular text-[28px] leading-9 font-bold tracking-tight">
        {value}
      </span>
      <span
        className={cn(
          "text-sm",
          hero ? "text-on-navy-muted" : "text-muted-foreground",
        )}
      >
        {caption}
      </span>
    </div>
  );
}

function TodoList({ d, base }: { d: Dashboard; base: string }) {
  const today = formatDayLabel;
  const items: {
    key: string;
    icon: LucideIcon;
    tone: string;
    title: string;
    subtitle: string;
    href: string;
  }[] = [
    ...d.overdueOrders.map((o) => ({
      key: `late-${o.id}`,
      icon: Clock,
      tone: "bg-danger-soft text-danger",
      title: `${customerName(o)} : en retard depuis ${today(o.scheduledDate).toLowerCase()}`,
      subtitle: `${parcelNumber(o)} · ${formatAr(o.totalAmount)}${o.delivery?.place ? ` · ${o.delivery.place}` : ""}`,
      href: `${base}/commandes?commande=${o.id}`,
    })),
    ...(d.unpaid.count > 0
      ? [
          {
            key: "unpaid",
            icon: Wallet,
            tone: "bg-navy-soft text-navy",
            title: `${formatAr(d.unpaid.amount)} à encaisser`,
            subtitle: `${plural(d.unpaid.count, "commande")} non payée${d.unpaid.count > 1 ? "s" : ""}`,
            href: `${base}/commandes?quand=toutes`,
          },
        ]
      : []),
    ...d.lowStockProducts.map((p) => ({
      key: `stock-${p.id}`,
      icon: AlertTriangle,
      tone: "bg-gold-soft text-gold-ink",
      title:
        p.stockQuantity === 0
          ? `${p.name} : en rupture`
          : `${p.name} : plus que ${p.stockQuantity} en stock`,
      subtitle: "Stock faible · réapprovisionner",
      href: `${base}/stock/${p.id}`,
    })),
  ];
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle>À faire</CardTitle>
        {items.length > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-navy px-2 text-xs font-bold text-white">
            {items.length}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Rien d’urgent : tout est à jour.
          </p>
        ) : (
          <ul className="divide-y">
            {items.slice(0, 8).map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 py-3"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      item.tone,
                    )}
                  >
                    <item.icon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {item.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ProfitDetail({
  d,
  base,
  period,
}: {
  d: Dashboard;
  base: string;
  period: DashboardPeriod;
}) {
  const line = (label: string, value: string, strong = false) => (
    <div
      className={cn(
        "flex items-center justify-between text-sm",
        strong && "font-semibold",
      )}
    >
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
  const costShare =
    d.revenue > 0
      ? Math.min(100, Math.round((d.costOfGoodsSold / d.revenue) * 100))
      : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Détail du bénéfice</CardTitle>
        <span className="text-xs text-muted-foreground">
          {PERIOD_CAPTION[period]}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {d.revenue > 0 && (
          <div>
            <div
              className="flex h-2 overflow-hidden rounded-full bg-navy-soft"
              role="img"
              aria-label={`Coût ${costShare} %, marge ${100 - costShare} %`}
            >
              <span className="bg-cost" style={{ width: `${costShare}%` }} />
              <span
                className="bg-navy"
                style={{ width: `${100 - costShare}%` }}
              />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-cost" /> Coût {costShare}{" "}
                %
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-navy" /> Marge{" "}
                {100 - costShare} %
              </span>
            </div>
          </div>
        )}
        {line(
          `Chiffre d'affaires (${plural(d.salesCount, "vente")})`,
          formatAr(d.revenue),
        )}
        {line("Coût des produits vendus", `−${formatAr(d.costOfGoodsSold)}`)}
        {line("Marge brute", formatAr(d.grossMargin), true)}
        <Link
          href={`${base}/depenses`}
          className="flex items-center justify-between text-sm hover:underline"
        >
          <span className="text-muted-foreground">Dépenses</span>
          <span className="tabular">−{formatAr(d.expenses)}</span>
        </Link>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="font-semibold">Bénéfice estimé</span>
          <span
            className={cn(
              "tabular text-lg font-bold",
              d.estimatedProfit < 0 && "text-danger",
            )}
          >
            {formatAr(d.estimatedProfit)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Livraison exclue du CA. Les achats de produits (
          {formatAr(d.productPurchases)}) sont déjà comptés dans le coût des
          produits vendus.
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
      <Skeleton className="h-80 rounded-xl sm:col-span-2" />
      <Skeleton className="h-80 rounded-xl sm:col-span-2" />
    </div>
  );
}

export default function DashboardPage() {
  const shop = useShop();
  const router = useRouter();
  const allowed = useCan("dashboard");
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const dashboard = useDashboard(period, allowed);
  const base = `/s/${shop.id}`;

  // The CM has no dashboard (no figures): their home is the orders.
  useEffect(() => {
    if (!allowed) router.replace(`${base}/commandes`);
  }, [allowed, base, router]);
  if (!allowed) return null;

  const d = dashboard.data;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`${formatLongDate()} · ${shop.name}`}
        actions={
          <Segmented
            label="Période"
            value={period}
            onChange={setPeriod}
            options={PERIODS}
          />
        }
      />
      {dashboard.isError && (
        <ErrorState
          error={dashboard.error}
          onRetry={() => dashboard.refetch()}
        />
      )}
      {!d ? (
        !dashboard.isError && <DashboardSkeleton />
      ) : (
        <div
          className={cn(
            "flex flex-col gap-6 transition-opacity",
            dashboard.isPlaceholderData && "opacity-60",
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              hero
              label="Chiffre d'affaires"
              value={formatAr(d.revenue)}
              caption={
                plural(d.salesCount, "vente") + " " + PERIOD_CAPTION[period]
              }
              icon={TrendingUp}
            />
            <Kpi
              label="Bénéfice estimé"
              value={formatAr(d.estimatedProfit)}
              caption={`Dépenses déduites : ${formatAr(d.expenses)}`}
              icon={Wallet}
            />
            <Kpi
              label="Ventes et marge"
              value={`${d.salesCount} · ${d.grossMarginRate} %`}
              caption={`Marge brute : ${formatAr(d.grossMargin)}`}
              icon={ReceiptText}
            />
            <Kpi
              label="À encaisser"
              value={formatAr(d.unpaid.amount)}
              caption={
                d.unpaid.count
                  ? `${plural(d.unpaid.count, "commande")} non payée${d.unpaid.count > 1 ? "s" : ""}`
                  : "Tout est encaissé"
              }
              icon={Package}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {OPEN_STATUSES.map((status) => (
              <Link
                key={status}
                href={`${base}/commandes?statut=${status}&quand=toutes`}
                className="group flex flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-navy/30 hover:bg-navy-soft/40"
              >
                <span className="tabular text-2xl font-bold">
                  {d.ordersByStatus[status] ?? 0}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      STATUS_CLASSES[status].dot,
                    )}
                  />
                  {STATUS_LABELS[status]}
                  <ArrowRight className="ml-auto size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="flex flex-col gap-6">
              <TodoList d={d} base={base} />
              <Card className="gap-0 overflow-hidden pb-0">
                <CardHeader className="pb-4">
                  <CardTitle>Dernières commandes</CardTitle>
                  <Button
                    variant="link"
                    size="sm"
                    asChild
                    className="h-auto p-0"
                  >
                    <Link href={`${base}/commandes?quand=toutes`}>
                      Tout voir <ChevronRight />
                    </Link>
                  </Button>
                </CardHeader>
                {d.recentOrders.length === 0 ? (
                  <EmptyState
                    icon={ReceiptText}
                    title="Aucune commande pour l’instant"
                    description="Créez votre première commande avec la touche N."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Paiement</TableHead>
                        <TableHead>Créée</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.recentOrders.map((o) => (
                        <TableRow
                          key={o.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`${base}/commandes?commande=${o.id}`)
                          }
                        >
                          <TableCell className="font-semibold text-muted-foreground">
                            {parcelNumber(o)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {customerName(o)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={o.status} />
                          </TableCell>
                          <TableCell>
                            <PaymentBadge isPaid={o.isPaid} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatRelative(o.createdAt)}
                          </TableCell>
                          <TableCell className="tabular text-right font-semibold">
                            {formatAr(o.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>
            <ProfitDetail d={d} base={base} period={period} />
          </div>
        </div>
      )}
    </>
  );
}
