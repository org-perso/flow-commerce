"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { joinShop } from "@/features/team/team-api";
import { uploadImage } from "@/lib/product-image";

import {
  createShop,
  listShops,
  setMyNickname,
  updateShop,
  updateShopLogo,
  type Shop,
  type ShopInput,
  updateStatusColors,
} from "./shop-api";
import type { StatusColors } from "./state-colors";

export const shopsKey = ["shops"] as const;

export function useShops(enabled = true) {
  return useQuery({ queryKey: shopsKey, queryFn: listShops, enabled });
}

export function useCreateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShopInput) => createShop(input),
    onSuccess: (shop) =>
      queryClient.setQueryData<Shop[]>(shopsKey, (list) => [
        ...(list ?? []),
        shop,
      ]),
  });
}

export function useJoinShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinShop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopsKey }),
  });
}

/** A picked file is uploaded to Cloudinary then saved as the logo; null removes it. */
export function useUpdateShopLogo(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File | null) =>
      updateShopLogo(
        shopId,
        file ? await uploadImage(shopId, "logo", file) : null,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopsKey }),
  });
}

export function useUpdateShop(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShopInput) => updateShop(shopId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopsKey }),
  });
}

export function useUpdateStatusColors(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (colors: StatusColors) => updateStatusColors(shopId, colors),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shopsKey }),
  });
}

export function useSetMyNickname(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nickname: string | null) => setMyNickname(shopId, nickname),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: shopsKey });
      void queryClient.invalidateQueries({
        queryKey: ["shop", shopId, "members"],
      });
    },
  });
}
