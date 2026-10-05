"use client";

import { createContext, useContext, type ReactNode } from "react";

import { can, type Permission, type Role } from "./roles";
import type { Shop } from "./shop-api";

const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({
  shop,
  children,
}: {
  shop: Shop;
  children: ReactNode;
}) {
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

/** The active shop (from the URL /s/[shopId]); only inside the shop layout. */
export function useShop(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShop must be used inside the shop layout.");
  return shop;
}

export const useShopId = () => useShop().id;
export const useRole = (): Role => useShop().role;

/** The web only hides what the role cannot do; the API checks everything. */
export function useCan(permission: Permission): boolean {
  return can(useShop().role, permission);
}
