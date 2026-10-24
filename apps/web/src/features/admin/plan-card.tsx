"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/app/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { post, type Plan } from "./admin-api";
import { formatDate, SectionCard } from "./admin-ui";
import { PLAN_LABELS } from "./labels";
import { useAdminAction } from "./use-admin";

const DURATIONS = [
  { value: 1, label: "1 mois" },
  { value: 3, label: "3 mois" },
  { value: 12, label: "12 mois" },
  { value: null, label: "Sans fin" },
] as const;

/** The shop's plan, and changing it by hand: offer, extend, downgrade (F-24). */
export function PlanCard({
  shopId,
  plan,
  endsAt,
}: {
  shopId: string;
  plan: Plan;
  endsAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<Plan>("BUSINESS");
  const [months, setMonths] = useState<number | null>(3);
  const [details, setDetails] = useState("");
  const change = useAdminAction(
    () =>
      post(`/shops/${shopId}/plan`, {
        plan: next,
        months: next === "FREE" ? null : months,
        details: details.trim() || null,
      }),
    "Formule modifiée",
  );
  // Read once: the time does not need to tick on this page.
  const [now] = useState(() => Date.now());
  const expired = endsAt !== null && Date.parse(endsAt) < now;

  return (
    <SectionCard
      title="Formule"
      actions={
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <CreditCard /> Changer
        </Button>
      }
    >
      <p className="px-5 py-4 text-sm">
        <strong>{PLAN_LABELS[plan]}</strong>
        {plan !== "FREE" &&
          (endsAt
            ? ` · ${expired ? "terminée le" : "jusqu’au"} ${formatDate(endsAt)}`
            : " · sans date de fin")}
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer la formule</DialogTitle>
            <DialogDescription>
              Offrir une période (vendeur pilote), prolonger, ou repasser en
              Gratuit. La durée s’ajoute à la fin de la formule en cours.
            </DialogDescription>
          </DialogHeader>
          <Field label="Formule">
            <div className="grid grid-cols-3 gap-2">
              {(["FREE", "PRO", "BUSINESS"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNext(p)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium",
                    next === p ? "border-navy bg-navy-soft" : "hover:bg-accent",
                  )}
                >
                  {PLAN_LABELS[p]}
                </button>
              ))}
            </div>
          </Field>
          {next !== "FREE" && (
            <Field label="Durée ajoutée">
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setMonths(d.value)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-sm",
                      months === d.value
                        ? "border-navy bg-navy-soft"
                        : "hover:bg-accent",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Précisions (facultatif)">
            <Input
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ex. Vendeur pilote, geste commercial…"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Retour
            </Button>
            <Button
              disabled={change.isPending}
              onClick={() =>
                change.mutate(undefined, { onSuccess: () => setOpen(false) })
              }
            >
              {change.isPending && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
