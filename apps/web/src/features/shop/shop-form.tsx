"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/app/field";
import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { shopSchema, toShopInput, type ShopFormValues } from "./schemas";
import type { Shop, ShopInput } from "./shop-api";

export function ShopForm({
  shop,
  submitLabel,
  onSubmit,
  error,
}: {
  shop?: Pick<Shop, "name" | "description">;
  submitLabel: string;
  onSubmit: (input: ShopInput) => Promise<unknown>;
  error: unknown;
}) {
  const { register, handleSubmit, formState } = useForm<ShopFormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: shop?.name ?? "",
      description: shop?.description ?? "",
    },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(toShopInput(values));
    } catch {
      // Shown through `error`.
    }
  });
  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error != null && <ErrorState error={error} />}
      <Field
        label="Nom de la boutique"
        htmlFor="shop-name"
        error={formState.errors.name?.message}
      >
        <Input
          id="shop-name"
          placeholder="Ex. Glow UP"
          maxLength={150}
          {...register("name")}
          aria-invalid={!!formState.errors.name}
        />
      </Field>
      <Field
        label="Description (facultatif)"
        htmlFor="shop-description"
        error={formState.errors.description?.message}
      >
        <Textarea
          id="shop-description"
          rows={3}
          maxLength={1000}
          placeholder="Ce que vous vendez, où vous livrez…"
          {...register("description")}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
