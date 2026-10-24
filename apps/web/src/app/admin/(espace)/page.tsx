"use client";

import { Ban, Flag, ReceiptText, Store, UserPlus, Users } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { ErrorState } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionCard, StatCard } from "@/features/admin/admin-ui";
import { PLAN_LABELS } from "@/features/admin/labels";
import {
  useAdminActivity,
  useAdminDashboard,
} from "@/features/admin/use-admin";
import type { ActivityDay, Plan } from "@/features/admin/admin-api";
import { formatAr } from "@/lib/format";
import { cn } from "@/lib/utils";

/** F-20: platform figures (counts only). */
export default function AdminDashboardPage() {
  const dashboard = useAdminDashboard();
  const activity = useAdminActivity(30);
  const d = dashboard.data;

  return (
    <>
      <PageHeader
        refresh
        title="Tableau de bord"
        description="Toute la plateforme Flow.Co."
      />
      {dashboard.isError && (
        <ErrorState
          error={dashboard.error}
          onRetry={() => dashboard.refetch()}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {d ? (
          <>
            <StatCard
              icon={Users}
              label="Utilisateurs"
              value={d.users.total}
              hint={`+${d.users.today} aujourd’hui · +${d.users.last7Days} sur 7 jours`}
            />
            <StatCard
              icon={Store}
              label="Boutiques actives"
              value={`${d.shops.active} / ${d.shops.total}`}
              hint="Au moins une commande sur les 7 derniers jours"
            />
            <StatCard
              icon={ReceiptText}
              label="Commandes aujourd’hui"
              value={d.orders.today}
              hint={`${d.orders.last30Days} sur 30 jours`}
            />
            <StatCard
              icon={UserPlus}
              label="Nouvelles boutiques"
              value={d.shops.last30Days}
              hint="Sur 30 jours"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))
        )}
      </div>

      {d && (
        <div className="grid gap-4 sm:grid-cols-3">
          <AlertLink
            href="/admin/boutiques?status=flagged"
            icon={Flag}
            label="Boutiques signalées"
            count={d.shops.flagged}
          />
          <AlertLink
            href="/admin/boutiques?status=suspended"
            icon={Ban}
            label="Boutiques suspendues"
            count={d.shops.suspended}
          />
          <AlertLink
            href="/admin/utilisateurs?status=suspended"
            icon={Ban}
            label="Comptes suspendus"
            count={d.users.suspended}
          />
        </div>
      )}

      <SectionCard title="Activité des 30 derniers jours">
        {activity.data ? (
          <ActivityChart days={activity.data} />
        ) : (
          <Skeleton className="m-5 h-48" />
        )}
      </SectionCard>

      {d && (
        <SectionCard title="Formules">
          <div className="flex flex-wrap gap-6 px-5 py-4 text-sm">
            {(Object.keys(PLAN_LABELS) as Plan[]).map((plan) => (
              <div key={plan}>
                <p className="text-muted-foreground">{PLAN_LABELS[plan]}</p>
                <p className="tabular text-xl font-bold">
                  {d.plans.byPlan[plan] ?? 0}
                </p>
              </div>
            ))}
            <div>
              <p className="text-muted-foreground">Encaissé ce mois-ci</p>
              <p className="tabular text-xl font-bold">
                {formatAr(d.plans.revenueThisMonth)}
              </p>
            </div>
            <Link href="/admin/paiements" className="hover:underline">
              <p className="text-muted-foreground">Paiements à valider</p>
              <p
                className={cn(
                  "tabular text-xl font-bold",
                  d.plans.pendingPayments > 0 && "text-gold-ink",
                )}
              >
                {d.plans.pendingPayments}
              </p>
            </Link>
            <div>
              <p className="text-muted-foreground">Finissent sous 7 jours</p>
              <p className="tabular text-xl font-bold">{d.plans.endingSoon}</p>
            </div>
          </div>
        </SectionCard>
      )}
    </>
  );
}

function AlertLink({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: typeof Flag;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-5 py-4 text-sm transition-colors hover:bg-accent",
        count > 0 && "border-gold/50",
      )}
    >
      <Icon
        className={cn(
          "size-4",
          count > 0 ? "text-gold-ink" : "text-muted-foreground",
        )}
      />
      <span className="flex-1">{label}</span>
      <span className="tabular text-lg font-bold">{count}</span>
    </Link>
  );
}

/** Orders per day as bars; sign-ups shown in the tooltip. */
function ActivityChart({ days }: { days: ActivityDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.orders));
  const total = days.reduce((sum, d) => sum + d.orders, 0);
  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-sm text-muted-foreground">
        {total} commande{total > 1 ? "s" : ""} créée{total > 1 ? "s" : ""} sur
        la période
      </p>
      <div
        className="flex h-48 items-end gap-1"
        role="img"
        aria-label="Commandes par jour"
      >
        {days.map((d) => (
          <div
            key={d.date}
            className="group relative flex h-full flex-1 flex-col justify-end"
            title={`${d.date.split("-").reverse().join("/")} : ${d.orders} commande(s), ${d.signups} inscription(s), ${d.shops} boutique(s)`}
          >
            <div
              className="min-h-0.5 rounded-t-sm bg-navy/80 transition-colors group-hover:bg-gold dark:bg-link/70"
              style={{ height: `${(d.orders / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{days[0]?.date.split("-").reverse().slice(0, 2).join("/")}</span>
        <span>Aujourd’hui</span>
      </div>
    </div>
  );
}
