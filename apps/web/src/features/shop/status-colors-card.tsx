"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { useShop } from "./shop-context";
import {
  COLORED_STATES,
  PALETTE,
  STATE_COLOR_CHOICES,
  colorVars,
  defaultColor,
  type ColorKey,
  type ColoredState,
  type StatusColors,
} from "./state-colors";
import { useUpdateStatusColors } from "./use-shops";

/**
 * Colors of the order states and of the payment, for the whole team (owner only):
 * order rows take the status color as background, the payment color as their left stripe.
 */
export function StatusColorsCard() {
  const shop = useShop();
  const save = useUpdateStatusColors(shop.id);
  const [draft, setDraft] = useState<StatusColors>(shop.statusColors ?? {});

  const colorOf = (state: ColoredState): ColorKey =>
    draft[state] ?? defaultColor(state);
  const pick = (state: ColoredState, key: ColorKey) =>
    setDraft((current) => {
      const next = { ...current };
      // The default is not stored: the shop follows future defaults.
      if (key === defaultColor(state)) delete next[state];
      else next[state] = key;
      return next;
    });

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Couleurs des états</CardTitle>
        <CardDescription>
          Le fond des commandes prend la couleur de leur état ; la bande à
          gauche, celle du paiement. Mêmes couleurs pour toute l’équipe, sur le
          web et sur l’application mobile.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {COLORED_STATES.map((state) => (
          <div key={state} className="flex items-center gap-3">
            <span
              style={colorVars(colorOf(state))}
              className="state-badge inline-flex h-9 flex-1 items-center gap-2 rounded-md px-3 text-sm font-semibold"
            >
              <span className="state-dot size-2 rounded-full" />
              {STATE_COLOR_CHOICES[state].label}
            </span>
            <div
              className="flex gap-2"
              role="radiogroup"
              aria-label={STATE_COLOR_CHOICES[state].label}
            >
              {STATE_COLOR_CHOICES[state].colors.map((key) => {
                const selected = colorOf(state) === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    title={PALETTE[key].label}
                    onClick={() => pick(state, key)}
                    style={{ backgroundColor: PALETTE[key].fg }}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110",
                      selected &&
                        "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                    )}
                  >
                    {selected && <Check className="size-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate(draft, {
                onSuccess: () => toast.success("Couleurs enregistrées."),
                onError: (e) => toast.error(apiErrorMessage(e)),
              })
            }
          >
            {save.isPending && <Loader2 className="animate-spin" />} Enregistrer
          </Button>
          <Button variant="ghost" onClick={() => setDraft({})}>
            Revenir aux couleurs par défaut
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
