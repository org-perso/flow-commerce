"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { ErrorState, InlineAlert } from "@/components/app/states";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductForm } from "@/features/product/product-form";
import { useProduct, useUpdateProduct } from "@/features/product/use-products";
import { useCan, useShopId } from "@/features/shop/shop-context";

export default function EditProductPage() {
  const shopId = useShopId();
  const router = useRouter();
  const { productId } = useParams<{ productId: string }>();
  const canWrite = useCan("catalog.write");
  const product = useProduct(productId);
  const update = useUpdateProduct(productId);
  const back = `/s/${shopId}/stock/${productId}`;

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href={back}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {product.data?.name ?? "Produit"}
        </Link>
        <PageHeader title="Modifier le produit" />
      </div>
      {!canWrite && (
        <InlineAlert>
          Votre rôle ne permet pas de modifier les produits.
        </InlineAlert>
      )}
      {product.isError && (
        <ErrorState error={product.error} onRetry={() => product.refetch()} />
      )}
      {!product.data && !product.isError && (
        <Skeleton className="h-96 max-w-4xl rounded-xl" />
      )}
      {canWrite && product.data && (
        <ProductForm
          key={product.data.id}
          product={product.data}
          submitLabel="Enregistrer"
          error={update.error}
          onSubmit={async ({ initialStock: _initialStock, ...values }) => {
            await update.mutateAsync(values);
            toast.success("Produit enregistré.");
            router.push(back);
          }}
        />
      )}
    </>
  );
}
