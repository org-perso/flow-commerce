"use client";

import { Check, Clock, Copy, Crown, Loader2, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/app/field";
import { PageHeader } from "@/components/app/page-header";
import { ErrorState, InlineAlert } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/features/shop/shop-context";
import {
  OPERATOR_LABELS,
  PAYMENT_STATUS_LABELS,
  PLAN_LABELS,
  useDeclarePayment,
  useSubscription,
  type Months,
  type Operator,
  type PaidPlan,
  type Plan,
  type PlanLimits,
  type Subscription,
} from "@/features/subscription/subscription";
import { apiErrorMessage } from "@/lib/api-client";
import { formatAr, formatDateTime, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

const longDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Indian/Antananarivo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));

const FEATURES: Record<Plan, string[]> = {
  FREE: ["1 boutique", "50 commandes par mois", "Stock, clients, dépenses"],
  PRO: [
    "Commandes illimitées",
    "1 membre d’équipe (gérant ou CM)",
    "Tout le Gratuit",
  ],
  BUSINESS: [
    "3 boutiques",
    "Équipe et livreurs illimités",
    "Tournées et notifications",
  ],
};

/** The shop's plan and its payments (owner only, docs/subscription.md). */
export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionContent />
    </Suspense>
  );
}

function SubscriptionContent() {
  const canManage = useCan("shop.settings");
  const subscription = useSubscription();
  // "?formule=PRO" (from an upgrade sheet or a banner): the payment opens on that plan.
  const asked = useSearchParams().get("formule");
  const [choice, setChoice] = useState<PaidPlan | null>(
    asked === "PRO" || asked === "BUSINESS" ? asked : null,
  );
  const s = subscription.data;

  if (!canManage) {
    return (
      <InlineAlert tone="info">
        Seul le propriétaire de la boutique gère l’abonnement.
      </InlineAlert>
    );
  }

  return (
    <>
      <PageHeader title="Abonnement" refresh />
      {subscription.isError && (
        <ErrorState
          error={subscription.error}
          onRetry={() => subscription.refetch()}
        />
      )}
      {!s ? (
        <Skeleton className="h-40 max-w-3xl" />
      ) : (
        <div className="grid max-w-5xl gap-6">
          <CurrentPlan s={s} />
          <div className="grid gap-4 lg:grid-cols-3">
            {(["FREE", "PRO", "BUSINESS"] as const).map((plan) => (
              <PlanCard
                key={plan}
                plan={plan}
                s={s}
                onChoose={plan === "FREE" ? undefined : () => setChoice(plan)}
              />
            ))}
          </div>
          <Comparison s={s} />
          {s.payments.length > 0 && <Payments s={s} />}
        </div>
      )}
      {s && choice && (
        <PayDialog s={s} plan={choice} onClose={() => setChoice(null)} />
      )}
    </>
  );
}

function CurrentPlan({ s }: { s: Subscription }) {
  const orderLimit = s.limits.ordersPerMonth;
  const used = s.usage.ordersThisMonth;
  return (
    <Card className="gap-3 px-6 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">Votre formule</span>
        <Badge variant={s.plan === "FREE" ? "secondary" : "warning"}>
          {PLAN_LABELS[s.plan]}
        </Badge>
        {s.pendingPlan && <Badge variant="outline">Paiement en attente</Badge>}
      </div>
      {s.endsAt && s.paidPlan !== "FREE" && (
        <p className="text-sm">
          {s.inGrace ? "Terminé le " : "Jusqu’au "}
          <strong>{longDate(s.endsAt)}</strong>
        </p>
      )}
      {s.inGrace && (
        <InlineAlert tone="warning" icon={Clock}>
          Votre abonnement est terminé : encore {s.graceDays} jours de grâce
          avant le retour en Gratuit. Renouvelez-le pour continuer.
        </InlineAlert>
      )}
      {s.pendingPlan && (
        <InlineAlert tone="info" icon={Clock}>
          Paiement reçu : la formule {PLAN_LABELS[s.pendingPlan]} est active en
          attendant sa validation par Flow.Co.
        </InlineAlert>
      )}
      {!s.enforced && (
        <InlineAlert tone="success" icon={Sparkles}>
          Offre de lancement : toutes les fonctionnalités sont offertes pour le
          moment.
        </InlineAlert>
      )}
      {orderLimit !== null && (
        <div className="max-w-md">
          <div className="flex justify-between text-sm">
            <span>Commandes ce mois-ci</span>
            <span className="tabular font-semibold">
              {used} / {orderLimit}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                used >= orderLimit
                  ? "bg-danger"
                  : used >= orderLimit * 0.8
                    ? "bg-gold"
                    : "bg-navy",
              )}
              style={{ width: `${Math.min(100, (used / orderLimit) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function PlanCard({
  plan,
  s,
  onChoose,
}: {
  plan: Plan;
  s: Subscription;
  onChoose?: () => void;
}) {
  const current = s.plan === plan;
  const price = s.plans[plan].price;
  return (
    <Card
      className={cn(
        "flex flex-col gap-4 px-6 py-5",
        plan === "PRO" && "border-2 border-gold",
      )}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{PLAN_LABELS[plan]}</h2>
        {current ? (
          <Badge variant="success">Actuelle</Badge>
        ) : (
          plan === "PRO" && <Badge variant="warning">Le plus utilisé</Badge>
        )}
      </div>
      <p>
        <span className="tabular text-3xl font-bold">{formatAr(price)}</span>
        {price > 0 && (
          <span className="text-sm text-muted-foreground"> / mois</span>
        )}
      </p>
      <ul className="flex-1 space-y-2 text-sm">
        {FEATURES[plan].map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
          </li>
        ))}
      </ul>
      {onChoose && (
        <Button
          variant={plan === "PRO" ? "gold" : "default"}
          onClick={onChoose}
          disabled={!!s.pendingPlan}
        >
          {current ? "Prolonger" : `Passer à ${PLAN_LABELS[plan]}`}
        </Button>
      )}
    </Card>
  );
}

function PayDialog({
  s,
  plan,
  onClose,
}: {
  s: Subscription;
  plan: PaidPlan;
  onClose: () => void;
}) {
  const [months, setMonths] = useState<Months>(1);
  const [operator, setOperator] = useState<Operator>("MVOLA");
  const [reference, setReference] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const declare = useDeclarePayment();
  const [done, setDone] = useState(false);
  const amount = s.prices[plan][months];
  const payTo = s.payTo[operator];

  const submit = () =>
    declare.mutate(
      {
        plan,
        months,
        operator,
        reference: reference.trim(),
        payerPhone: payerPhone.trim() || null,
      },
      {
        onSuccess: () => setDone(true),
      },
    );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
              <Crown className="size-6" />
            </span>
            <DialogTitle>🎉 {PLAN_LABELS[plan]} est actif !</DialogTitle>
            <DialogDescription>
              Nous vérifions votre paiement sous 24 h. En attendant, profitez de
              toutes les fonctions de {PLAN_LABELS[plan]}.
            </DialogDescription>
            <Button onClick={onClose}>Continuer</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Passer à {PLAN_LABELS[plan]}</DialogTitle>
              <DialogDescription>
                Payez par Mobile Money, puis saisissez la référence reçue par
                SMS.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <Field label="Durée">
                <div className="grid grid-cols-3 gap-2">
                  {s.durations.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonths(m)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm",
                        months === m
                          ? "border-navy bg-navy-soft"
                          : "hover:bg-accent",
                      )}
                    >
                      <span className="block font-semibold">
                        {m} mois{m === 12 && " (2 offerts)"}
                      </span>
                      <span className="tabular text-xs text-muted-foreground">
                        {formatAr(s.prices[plan][m])}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Opérateur">
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(OPERATOR_LABELS) as Operator[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOperator(o)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium",
                        operator === o
                          ? "border-navy bg-navy-soft"
                          : "hover:bg-accent",
                      )}
                    >
                      {OPERATOR_LABELS[o]}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="rounded-lg bg-gold-soft p-4 text-sm">
                <p>
                  Envoyez{" "}
                  <strong className="tabular">{formatAr(amount)}</strong> au{" "}
                  <strong>
                    {payTo
                      ? formatPhone(payTo)
                      : "numéro communiqué par Flow.Co"}
                  </strong>{" "}
                  ({OPERATOR_LABELS[operator]})
                  {payTo && <CopyButton text={payTo} label="Numéro copié." />}
                </p>
                <p className="mt-1">
                  Motif :{" "}
                  <strong className="font-mono">{s.paymentReference}</strong>
                  <CopyButton text={s.paymentReference} label="Motif copié." />
                </p>
              </div>
              <Field
                label="Référence de la transaction (SMS de confirmation)"
                htmlFor="ref"
              >
                <Input
                  id="ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex. MP241024.1530.A12345"
                  className="font-mono uppercase"
                />
              </Field>
              <Field label="Numéro qui a payé (facultatif)" htmlFor="payer">
                <Input
                  id="payer"
                  type="tel"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="034 00 000 00"
                />
              </Field>
              {declare.error && (
                <p className="text-sm text-danger">
                  {apiErrorMessage(declare.error)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Retour
              </Button>
              <Button
                disabled={reference.trim().length < 4 || declare.isPending}
                onClick={submit}
              >
                {declare.isPending && <Loader2 className="animate-spin" />}
                J’ai payé
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Payments({ s }: { s: Subscription }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <h2 className="border-b px-5 py-3 font-semibold">Paiements</h2>
      <ul className="divide-y">
        {s.payments.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
          >
            <span className="min-w-0 flex-1">
              <span className="font-medium">
                {PLAN_LABELS[p.plan]} · {p.months} mois · {formatAr(p.amount)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {OPERATOR_LABELS[p.operator]} · réf. {p.reference} ·{" "}
                {formatDateTime(p.createdAt)}
              </span>
              {p.rejectReason && (
                <span className="block text-xs text-danger">
                  Motif : {p.rejectReason}
                </span>
              )}
            </span>
            <Badge
              variant={
                p.status === "VALIDATED"
                  ? "success"
                  : p.status === "REJECTED"
                    ? "danger"
                    : "outline"
              }
            >
              {PAYMENT_STATUS_LABELS[p.status]}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(label);
        } catch {
          toast.error("Copie impossible : sélectionnez le texte à la main.");
        }
      }}
      className="ml-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-link hover:bg-white/60"
    >
      <Copy className="size-3" /> Copier
    </button>
  );
}

const ROWS: { label: string; value: (p: PlanLimits) => string }[] = [
  {
    label: "Commandes par mois",
    value: (p) =>
      p.ordersPerMonth === null ? "Illimitées" : String(p.ordersPerMonth),
  },
  {
    label: "Membres d’équipe",
    value: (p) =>
      p.members === null
        ? "Illimités"
        : p.members === 0
          ? "—"
          : String(p.members),
  },
  {
    label: "Livreurs",
    value: (p) =>
      p.drivers === null
        ? "Illimités"
        : p.drivers === 0
          ? "—"
          : String(p.drivers),
  },
  { label: "Boutiques", value: (p) => String(p.shops) },
  { label: "Prix par mois", value: (p) => formatAr(p.price) },
];

/** Line by line: what each plan includes; what the current one lacks wears a crown. */
function Comparison({ s }: { s: Subscription }) {
  const plans = ["FREE", "PRO", "BUSINESS"] as const;
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <h2 className="border-b px-5 py-3 font-semibold">
        Comparer les formules
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="px-5 py-2 font-medium text-muted-foreground" />
            {plans.map((p) => (
              <th
                key={p}
                className={cn(
                  "px-3 py-2 font-semibold",
                  s.plan === p && "bg-navy-soft",
                )}
              >
                {PLAN_LABELS[p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => {
            const mine = row.value(s.plans[s.plan]);
            return (
              <tr key={row.label} className="border-b last:border-0">
                <td className="px-5 py-2 text-muted-foreground">{row.label}</td>
                {plans.map((p) => {
                  const value = row.value(s.plans[p]);
                  const better =
                    p !== s.plan &&
                    value !== mine &&
                    row.label !== "Prix par mois";
                  return (
                    <td
                      key={p}
                      className={cn(
                        "tabular px-3 py-2",
                        s.plan === p && "bg-navy-soft font-semibold",
                      )}
                    >
                      {value}
                      {better && p !== "FREE" && (
                        <Crown className="ml-1 inline size-3.5 text-gold" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
