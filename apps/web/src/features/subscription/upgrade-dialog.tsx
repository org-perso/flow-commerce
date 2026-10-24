"use client";

import { Crown } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShops } from "@/features/shop/use-shops";
import { formatAr } from "@/lib/format";

import { requiredPlan, type Limit } from "./plan-gate";
import { PLAN_LABELS, type PaidPlan } from "./subscription";

const PRICES: Record<PaidPlan, number> = { PRO: 20_000, BUSINESS: 30_000 };

const COPY: Record<Limit, { title: string; text: (plan: PaidPlan) => string }> =
  {
    orders: {
      title: "Vous avez atteint 50 commandes ce mois-ci 🎉",
      text: () =>
        "Bravo, votre boutique grandit ! Avec Pro, vos commandes sont illimitées. Sinon, le compteur repart le 1er du mois.",
    },
    members: {
      title: "Travaillez à plusieurs",
      text: (plan) =>
        plan === "PRO"
          ? "Pro inclut un membre d’équipe (gérant ou community manager). Business : une équipe illimitée."
          : "Business inclut une équipe illimitée : gérants, community managers et livreurs.",
    },
    drivers: {
      title: "Gérez vos livreurs",
      text: () =>
        "Tournées, notifications et encaissements des livreurs sont inclus dans Business.",
    },
    shops: {
      title: "Plusieurs boutiques ?",
      text: () =>
        "Business vous permet de gérer jusqu’à 3 boutiques avec le même compte.",
    },
  };

/**
 * Shown instead of an error when a plan limit is reached: why, what the next plan brings, its
 * price, and one button to pay it. Members who are not the owner are told to ask them.
 */
export function UpgradeDialog({
  limit,
  onClose,
  shopId,
  currentPlan = "FREE",
  isOwner,
}: {
  limit: Limit | null;
  onClose: () => void;
  /** Shop whose subscription to open; by default the first shop the user owns. */
  shopId?: string;
  currentPlan?: "FREE" | PaidPlan;
  isOwner: boolean;
}) {
  const shops = useShops(limit !== null && !shopId);
  const target = shopId ?? shops.data?.find((s) => s.role === "OWNER")?.id;
  if (!limit) return null;
  const plan = requiredPlan(limit, currentPlan);
  const copy = COPY[limit];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-gold-soft text-gold-ink">
            <Crown className="size-5" />
          </span>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.text(plan)}</DialogDescription>
        </DialogHeader>
        {isOwner ? (
          <p className="text-sm">
            {PLAN_LABELS[plan]} :{" "}
            <strong className="tabular">{formatAr(PRICES[plan])}</strong> par
            mois, sans engagement. Payez par MVola, Orange Money ou Airtel
            Money.
          </p>
        ) : (
          <p className="text-sm">
            Votre boutique a atteint la limite de sa formule : prévenez le
            propriétaire.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Plus tard
          </Button>
          {isOwner && target && (
            <Button variant="gold" asChild>
              <Link
                href={`/s/${target}/abonnement?formule=${plan}`}
                onClick={onClose}
              >
                <Crown /> Passer à {PLAN_LABELS[plan]}
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
