import { apiFetch } from "@/lib/api-client";

/**
 * The signed-in user as the API knows them (created on their first request).
 * Shape assumed (not typed in the mobile app): see API-ASSUMPTIONS.md.
 */
export type Me = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt?: string;
};

export function getMe(): Promise<Me> {
  return apiFetch("/me");
}

/** Only the account name is editable (assumed body: { name }). */
export function updateMe(input: { name: string | null }): Promise<Me> {
  return apiFetch("/me", { method: "PATCH", body: JSON.stringify(input) });
}

/** Deletes my data; returns the photo URLs to remove from Firebase Storage. */
export function deleteMe(): Promise<{ images: string[] }> {
  return apiFetch("/me", { method: "DELETE" });
}
