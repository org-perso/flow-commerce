"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/app/field";
import { ErrorState, InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useShopId } from "@/features/shop/shop-context";
import { ApiError } from "@/lib/api-client";
import { optionalTextField } from "@/lib/form-fields";
import { formatPhone } from "@/lib/format";

import type { Customer, CustomerInput } from "./customer-api";

const MAX_PHONES = 5;

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est requis.")
    .max(150, "150 caractères maximum."),
  phones: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .refine(
            (v) => v === "" || v.replace(/\D/g, "").length >= 6,
            "Numéro invalide.",
          ),
      }),
    )
    .transform((list) => list.map((p) => p.value).filter(Boolean)),
  socialProfile: optionalTextField(255),
});

export function CustomerForm({
  customer,
  submitLabel,
  onSubmit,
  error,
}: {
  customer?: Customer;
  submitLabel: string;
  onSubmit: (values: CustomerInput) => Promise<unknown>;
  error: unknown;
}) {
  const shopId = useShopId();
  const { register, control, handleSubmit, formState } = useForm<
    z.input<typeof schema>,
    unknown,
    CustomerInput
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      name: customer?.name ?? "",
      phones: customer?.phones.length
        ? customer.phones.map((p) => ({ value: formatPhone(p) }))
        : [{ value: "" }],
      socialProfile: customer?.socialProfile ?? "",
    },
  });
  const phones = useFieldArray({ control, name: "phones" });
  const duplicateOf =
    error instanceof ApiError && error.title === "Duplicate Phone"
      ? (error.body.customerId as string | undefined)
      : undefined;

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch {
      // Shown through `error`.
    }
  });

  return (
    <form
      onSubmit={submit}
      className="flex max-w-2xl flex-col gap-6"
      noValidate
    >
      {duplicateOf ? (
        <InlineAlert
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href={`/s/${shopId}/clients/${duplicateOf}`}>
                Voir ce client
              </Link>
            </Button>
          }
        >
          Le{" "}
          {formatPhone(
            String(error instanceof ApiError ? error.body.phone : ""),
          )}{" "}
          appartient déjà à un autre client.
        </InlineAlert>
      ) : (
        error != null && <ErrorState error={error} />
      )}
      <Card className="gap-4 px-5">
        <Field
          label="Nom"
          htmlFor="name"
          error={formState.errors.name?.message}
        >
          <Input
            id="name"
            placeholder="Ex. Rakoto Jean"
            maxLength={150}
            autoFocus
            {...register("name")}
            aria-invalid={!!formState.errors.name}
          />
        </Field>
        <div className="flex flex-col gap-3">
          {phones.fields.map((field, index) => (
            <Field
              key={field.id}
              label={
                index === 0 ? "Téléphone principal" : `Téléphone ${index + 1}`
              }
              htmlFor={`phone-${index}`}
              error={formState.errors.phones?.[index]?.value?.message}
            >
              <div className="flex gap-2">
                <Input
                  id={`phone-${index}`}
                  type="tel"
                  placeholder="034 12 345 67"
                  {...register(`phones.${index}.value`)}
                />
                {phones.fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer ce numéro"
                    onClick={() => phones.remove(index)}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </Field>
          ))}
          {phones.fields.length < MAX_PHONES && (
            <Button
              type="button"
              variant="link"
              className="w-fit px-0"
              onClick={() => phones.append({ value: "" })}
            >
              <Plus /> Ajouter un numéro
            </Button>
          )}
        </div>
        <Field
          label="Profil Facebook / réseau (facultatif)"
          htmlFor="social"
          hint="Nom sur Facebook, lien du profil, @compte Instagram…"
          error={formState.errors.socialProfile?.message}
        >
          <Input
            id="social"
            placeholder="Ex. Rakoto Jean ou fb.com/rakoto"
            {...register("socialProfile")}
          />
        </Field>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
