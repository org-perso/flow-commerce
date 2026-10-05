"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/app/field";
import { InlineAlert } from "@/components/app/states";
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
import { ApiError, apiErrorMessage } from "@/lib/api-client";
import { optionalTextField, quantityField } from "@/lib/form-fields";

import type { ManualMovementType, Product } from "./product-api";
import { useCreateStockMovement } from "./use-products";

export const MOVEMENT_COPY: Record<
  ManualMovementType,
  { title: string; field: string; hint: string; submit: string }
> = {
  AJOUT: {
    title: "Entrée de stock",
    field: "Quantité reçue",
    hint: "Ex. réception de marchandise.",
    submit: "Ajouter au stock",
  },
  RETRAIT: {
    title: "Sortie de stock",
    field: "Quantité retirée",
    hint: "Ex. produit cassé, perdu, offert.",
    submit: "Retirer du stock",
  },
  AJUSTEMENT: {
    title: "Inventaire",
    field: "Quantité comptée",
    hint: "Le stock sera corrigé pour correspondre à ce que vous avez compté.",
    submit: "Corriger le stock",
  },
};

const schema = z.object({
  quantity: quantityField,
  reason: optionalTextField(500),
});

/** Entrée / Sortie / Inventaire: the only ways to change a stock. */
export function MovementDialog({
  product,
  type,
  onClose,
}: {
  product: Product;
  type: ManualMovementType;
  onClose: () => void;
}) {
  const create = useCreateStockMovement(product.id);
  const text = MOVEMENT_COPY[type];
  const current = product.stockQuantity;
  const { register, handleSubmit, formState, setError } = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    defaultValues: { quantity: "", reason: "" },
  });

  const submit = handleSubmit(async ({ quantity, reason }) => {
    // Inventory: the user types the counted stock, the API wants the correction.
    const delta = type === "AJUSTEMENT" ? quantity - current : quantity;
    if (delta === 0) {
      setError("quantity", {
        message:
          type === "AJUSTEMENT"
            ? "Le stock est déjà à cette valeur."
            : "Doit être supérieur à 0.",
      });
      return;
    }
    try {
      const result = await create.mutateAsync({
        type,
        quantity: delta,
        reason,
      });
      toast.success(`Stock de « ${product.name} » : ${result.stockQuantity}.`);
      onClose();
    } catch {
      // Shown below.
    }
  });

  const error = create.error;
  const errorMessage =
    error instanceof ApiError && error.status === 409
      ? `Stock insuffisant : il reste ${String(error.body.available ?? current)} unité(s).`
      : error
        ? apiErrorMessage(error)
        : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>
            {product.name} · stock actuel : <strong>{current}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {errorMessage && (
            <InlineAlert tone="danger">{errorMessage}</InlineAlert>
          )}
          <Field
            label={text.field}
            htmlFor="quantity"
            hint={text.hint}
            error={formState.errors.quantity?.message}
          >
            <Input
              id="quantity"
              inputMode="numeric"
              autoFocus
              {...register("quantity")}
              aria-invalid={!!formState.errors.quantity}
            />
          </Field>
          <Field
            label="Motif (facultatif)"
            htmlFor="reason"
            error={formState.errors.reason?.message}
          >
            <Input
              id="reason"
              placeholder={
                type === "AJOUT"
                  ? "Ex. livraison fournisseur"
                  : "Ex. produit abîmé"
              }
              {...register("reason")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" />}
              {text.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
