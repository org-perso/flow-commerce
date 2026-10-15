import type { StatusColors } from "./state-colors";
import { apiFetch } from "@/lib/api-client";

import type { Role } from "./roles";

export type Shop = {
  id: string;
  name: string;
  description: string | null;
  /** The current user's role in this shop. */
  role: Role;
  /** Their pseudo in this shop, shown to the other members (null: their account name). */
  nickname: string | null;
  /** Colors picked for the order states; absent on an older API. */
  statusColors?: StatusColors;
  createdAt: string;
  updatedAt: string;
};

export type ShopInput = {
  name: string;
  description: string | null;
};

export function listShops(): Promise<Shop[]> {
  return apiFetch("/shops");
}

export function createShop(input: ShopInput): Promise<Shop> {
  return apiFetch("/shops", { method: "POST", body: JSON.stringify(input) });
}

export function updateShop(shopId: string, input: ShopInput): Promise<Shop> {
  return apiFetch(`/shops/${shopId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Sets my pseudo in the shop (null: back to my account name). Unique per shop. */
export function setMyNickname(
  shopId: string,
  nickname: string | null,
): Promise<{ nickname: string | null }> {
  return apiFetch(`/shops/${shopId}/me`, {
    method: "PATCH",
    body: JSON.stringify({ nickname }),
  });
}

/** Saves the whole set of chosen colors ({} = defaults). Owner only. */
export function updateStatusColors(
  shopId: string,
  statusColors: StatusColors,
): Promise<Shop> {
  return apiFetch(`/shops/${shopId}`, {
    method: "PATCH",
    body: JSON.stringify({ statusColors }),
  });
}
