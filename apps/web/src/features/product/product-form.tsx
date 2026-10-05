"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/app/field";
import { ErrorState, InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useShopId } from "@/features/shop/shop-context";
import {
  amountField,
  optionalTextField,
  quantityField,
  toFieldValue,
  toInt,
} from "@/lib/form-fields";
import { formatAr } from "@/lib/format";
import { uploadProductImage } from "@/lib/product-image";

import { CategorySelect } from "./category-select";
import { ImageField } from "./image-field";
import type { Product, ProductInput } from "./product-api";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est requis.")
    .max(150, "150 caractères maximum."),
  description: optionalTextField(1000),
  categoryId: z.string().nullable(),
  purchasePrice: amountField,
  sellingPrice: amountField,
  lowStockThreshold: quantityField,
  initialStock: quantityField,
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;
export type ProductFormOutput = ProductInput & { initialStock: number };

export function ProductForm({
  product,
  submitLabel,
  onSubmit,
  error,
}: {
  product?: Product;
  submitLabel: string;
  onSubmit: (values: ProductFormOutput) => Promise<unknown>;
  error: unknown;
}) {
  const shopId = useShopId();
  const [image, setImage] = useState<{ url: string | null; file: File | null }>(
    { url: product?.image ?? null, file: null },
  );
  const [uploadError, setUploadError] = useState<unknown>(null);
  const { register, control, handleSubmit, formState } = useForm<
    FormInput,
    unknown,
    FormOutput
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      categoryId: product?.category?.id ?? null,
      purchasePrice:
        product?.purchasePrice !== undefined
          ? toFieldValue(product.purchasePrice)
          : "",
      sellingPrice: product ? toFieldValue(product.sellingPrice) : "",
      lowStockThreshold: toFieldValue(product?.lowStockThreshold ?? 0),
      initialStock: "0",
    },
  });
  const [purchase, selling] = useWatch({
    control,
    name: ["purchasePrice", "sellingPrice"],
  });
  const p = toInt(purchase ?? "");
  const s = toInt(selling ?? "");
  const margin = p !== null && s !== null ? s - p : null;

  const submit = handleSubmit(async (values) => {
    setUploadError(null);
    let url = image.url;
    if (image.file) {
      try {
        url = await uploadProductImage(shopId, image.file);
      } catch (e) {
        setUploadError(e);
        return;
      }
    }
    try {
      await onSubmit({ ...values, image: url });
    } catch {
      // Shown through `error`.
    }
  });

  const errors = formState.errors;
  return (
    <form
      onSubmit={submit}
      className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_300px]"
      noValidate
    >
      <div className="flex flex-col gap-6">
        {(error != null || uploadError != null) && (
          <ErrorState error={uploadError ?? error} />
        )}
        <Card className="gap-4 px-5">
          <h2 className="font-semibold">Produit</h2>
          <Field
            label="Nom du produit"
            htmlFor="name"
            error={errors.name?.message}
          >
            <Input
              id="name"
              placeholder="Ex. Savon coco"
              maxLength={150}
              {...register("name")}
              aria-invalid={!!errors.name}
            />
          </Field>
          <Field label="Catégorie">
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <CategorySelect value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
          <Field
            label="Description (facultatif)"
            htmlFor="description"
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={3}
              maxLength={1000}
              {...register("description")}
            />
          </Field>
          <Field label="Photo">
            <ImageField url={image.url} file={image.file} onChange={setImage} />
          </Field>
        </Card>
        <Card className="gap-4 px-5">
          <h2 className="font-semibold">Prix</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Prix d'achat (Ar)"
              htmlFor="purchasePrice"
              error={errors.purchasePrice?.message}
            >
              <Input
                id="purchasePrice"
                inputMode="numeric"
                placeholder="0"
                {...register("purchasePrice")}
                aria-invalid={!!errors.purchasePrice}
              />
            </Field>
            <Field
              label="Prix de vente (Ar)"
              htmlFor="sellingPrice"
              error={errors.sellingPrice?.message}
            >
              <Input
                id="sellingPrice"
                inputMode="numeric"
                placeholder="0"
                {...register("sellingPrice")}
                aria-invalid={!!errors.sellingPrice}
              />
            </Field>
          </div>
          {margin !== null && (
            <InlineAlert tone={margin > 0 ? "success" : "danger"}>
              {margin > 0
                ? `Marge : ${formatAr(margin)} par unité${s ? ` (${Math.round((margin / s) * 100)} %)` : ""}.`
                : "Le prix de vente ne couvre pas le prix d’achat."}
            </InlineAlert>
          )}
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        <Card className="gap-4 px-5">
          <h2 className="font-semibold">Stock</h2>
          {!product && (
            <Field
              label="Stock initial"
              htmlFor="initialStock"
              hint="Quantité que vous avez aujourd’hui."
              error={errors.initialStock?.message}
            >
              <Input
                id="initialStock"
                inputMode="numeric"
                {...register("initialStock")}
              />
            </Field>
          )}
          {product && (
            <p className="text-sm text-muted-foreground">
              Stock actuel :{" "}
              <strong className="text-foreground">
                {product.stockQuantity}
              </strong>
              . Il se modifie par une entrée, une sortie ou un inventaire,
              depuis la fiche du produit.
            </p>
          )}
          <Field
            label="Alerte stock faible"
            htmlFor="lowStockThreshold"
            hint="Alerte à partir de cette quantité."
            error={errors.lowStockThreshold?.message}
          >
            <Input
              id="lowStockThreshold"
              inputMode="numeric"
              {...register("lowStockThreshold")}
            />
          </Field>
        </Card>
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
