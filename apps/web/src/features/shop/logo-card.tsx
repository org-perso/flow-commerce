"use client";

import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageField } from "@/features/product/image-field";
import { apiErrorMessage } from "@/lib/api-client";

import { useShop } from "./shop-context";
import { useUpdateShopLogo } from "./use-shops";

/** Shop logo, saved as soon as it is picked or removed. Owner only. */
export function LogoCard() {
  const shop = useShop();
  const update = useUpdateShopLogo(shop.id);
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Logo</CardTitle>
        <CardDescription>
          Affiché dans le sélecteur de boutique, sur le web et le mobile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ImageField
          url={shop.logo ?? null}
          file={null}
          alt={`Logo de ${shop.name}`}
          disabled={update.isPending}
          onChange={({ file }) =>
            update.mutate(file, {
              onSuccess: () =>
                toast.success(file ? "Logo enregistré." : "Logo retiré."),
              onError: (error) => toast.error(apiErrorMessage(error)),
            })
          }
        />
      </CardContent>
    </Card>
  );
}
