import { ApiError } from "@/lib/api-client";
import { env } from "@/lib/env";

// Admin space client: the session is an HttpOnly cookie set by the API (never Firebase),
// so every call is made with credentials and no Authorization header.

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${env.apiUrl}/api/v1/admin${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    throw new ApiError(
      response.status,
      typeof problem.title === "string" ? problem.title : response.statusText,
      typeof problem.detail === "string" ? problem.detail : undefined,
      problem,
    );
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const post = <T>(path: string, body?: unknown) =>
  adminFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });

export const put = <T>(path: string, body: unknown) =>
  adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body) });

/** French message for an admin API error: the API's own detail is already in French. */
export function adminErrorMessage(error: unknown): string {
  if (error instanceof TypeError)
    return "Serveur injoignable. Vérifiez votre connexion.";
  if (error instanceof ApiError) {
    if (error.status >= 500 && error.status !== 503)
      return "Le serveur a rencontré un problème. Réessayez.";
    if (error.status === 400 && error.body.errors)
      return "Certains champs sont invalides.";
    return error.detail ?? error.title;
  }
  return "Une erreur est survenue. Réessayez.";
}

export const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

// --- Types (apps/api/src/modules/admin) ---

export type LoginNext = "mfa" | "mfa-setup" | "done";

export type AdminMe = {
  id: string;
  username: string;
  name: string;
  mustChangePassword: boolean;
  mfaEnabled: boolean;
  mfaRequired: boolean;
};

export type AdminAccount = AdminMe & {
  disabledAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AdminSession = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export type AuditEntry = {
  id: string;
  action: string;
  reason: string | null;
  details: string | null;
  createdAt: string;
  admin: { id: string; username: string; name: string };
};

export type Dashboard = {
  users: {
    total: number;
    today: number;
    last7Days: number;
    last30Days: number;
    suspended: number;
  };
  shops: {
    total: number;
    active: number;
    last30Days: number;
    suspended: number;
    flagged: number;
  };
  orders: { today: number; last30Days: number };
  plans: { byPlan: Partial<Record<Plan, number>> };
};

export type ActivityDay = {
  date: string;
  orders: number;
  signups: number;
  shops: number;
};

export type Plan = "FREE" | "PRO" | "BUSINESS";
export type ShopStatus = "ACTIVE" | "SUSPENDED";
export type MemberRole = "OWNER" | "MANAGER" | "CM" | "DRIVER";

export type AdminShop = {
  id: string;
  name: string;
  status: ShopStatus;
  plan: Plan;
  flaggedAt: string | null;
  createdAt: string;
  owner: { id: string; name: string | null; email: string | null };
  membersCount: number;
  ordersCount: number;
  orders30Days: number;
  lastActivityAt: string;
};

export type AdminShopDetail = AdminShop & {
  suspendedReason: string | null;
  flagReason: string | null;
  counts: { products: number; customers: number; expenses: number };
  members: {
    userId: string;
    name: string | null;
    email: string | null;
    role: MemberRole;
    joinedAt: string;
  }[];
  ordersByMonth: { month: string; orders: number }[];
  notes: {
    id: string;
    body: string;
    createdAt: string;
    admin: { id: string; username: string; name: string };
  }[];
  notices: {
    id: string;
    reason: string;
    message: string;
    createdAt: string;
    readAt: string | null;
  }[];
};

export type AdminUser = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: string;
  suspendedAt: string | null;
  shopsCount: number;
};

export type AdminUserDetail = AdminUser & {
  suspendedReason: string | null;
  shops: {
    id: string;
    name: string;
    role: MemberRole;
    status: ShopStatus;
    joinedAt: string;
  }[];
  actions: AuditEntry[];
};

export type Paged<T> = { items: T[]; total: number };

export const ACTION_REASONS = [
  "CONTENT",
  "FRAUD",
  "UNPAID",
  "OWNER_REQUEST",
  "OTHER",
] as const;
export type ActionReason = (typeof ACTION_REASONS)[number];
