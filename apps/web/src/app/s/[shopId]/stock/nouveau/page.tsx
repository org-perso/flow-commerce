"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { InlineAlert } from "@/components/app/states";
import { ProductForm } from "@/features/product/product-form";
import { useCreateProduct } from "@/features/product/use-products";
import { useCan, useShopId } from "@/features/shop/shop-context";

export default function NewProductPage() {
  const shopId = useShopId();
  const router = useRouter();
  const canWrite = useCan("catalog.write");
  const create = useCreateProduct();
  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={`/s/${shopId}/stock`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Stock
        </Link>
        <PageHeader title="Nouveau produit" />
      </div>
      {canWrite ? (
        <ProductForm
          submitLabel="Créer le produit"
          error={create.error}
          onSubmit={async (values) => {
            const product = await create.mutateAsync(values);
            toast.success(`« ${product.name} » ajouté au stock.`);
            router.push(`/s/${shopId}/stock/${product.id}`);
          }}
        />
      ) : (
        <InlineAlert>
          Votre rôle ne permet pas d’ajouter des produits.
        </InlineAlert>
      )}
    </>
  );
}
