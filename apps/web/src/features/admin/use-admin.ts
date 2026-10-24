"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { queryString } from "@/lib/api-client";
import type { Page } from "@/lib/paging";

import {
  adminErrorMessage,
  adminFetch,
  post,
  put,
  type ActivityDay,
  type AdminAccount,
  type AdminMe,
  type AdminSession,
  type AdminShop,
  type AdminShopDetail,
  type AdminUser,
  type AdminPayment,
  type AdminUserDetail,
  type AuditEntry,
  type Dashboard,
  type Paged,
} from "./admin-api";

// Every admin query lives under the "admin" key: signing out clears them all at once.
export const adminKeys = {
  all: ["admin"] as const,
  me: ["admin", "me"] as const,
  dashboard: ["admin", "dashboard"] as const,
  activity: (days: number) => ["admin", "activity", days] as const,
  shops: ["admin", "shops"] as const,
  shop: (id: string) => ["admin", "shops", id] as const,
  users: ["admin", "users"] as const,
  user: (id: string) => ["admin", "users", id] as const,
  admins: ["admin", "admins"] as const,
  sessions: ["admin", "sessions"] as const,
  payments: (status: string) => ["admin", "payments", status] as const,
};

/** The signed-in admin; a 401 means signed out (not retried). */
export function useAdminMe() {
  return useQuery({
    queryKey: adminKeys.me,
    queryFn: () => adminFetch<AdminMe>("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: () => adminFetch<Dashboard>("/dashboard"),
  });
}

export function useAdminActivity(days = 30) {
  return useQuery({
    queryKey: adminKeys.activity(days),
    queryFn: () =>
      adminFetch<ActivityDay[]>(`/dashboard/activity${queryString({ days })}`),
  });
}

export type ShopFilters = {
  search?: string;
  status?: "active" | "suspended" | "flagged";
  inactiveDays?: number;
};

export function useAdminShops(filters: ShopFilters, page: Page) {
  return useQuery({
    queryKey: [...adminKeys.shops, filters, page],
    queryFn: () =>
      adminFetch<Paged<AdminShop>>(
        `/shops${queryString({ ...filters, ...page })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminShop(id: string) {
  return useQuery({
    queryKey: adminKeys.shop(id),
    queryFn: () => adminFetch<AdminShopDetail>(`/shops/${id}`),
  });
}

export function useAdminShopActions(id: string) {
  return useQuery({
    queryKey: [...adminKeys.shop(id), "actions"],
    queryFn: () => adminFetch<AuditEntry[]>(`/shops/${id}/actions`),
  });
}

export type UserFilters = { search?: string; status?: "active" | "suspended" };

export function useAdminUsers(filters: UserFilters, page: Page) {
  return useQuery({
    queryKey: [...adminKeys.users, filters, page],
    queryFn: () =>
      adminFetch<Paged<AdminUser>>(
        `/users${queryString({ ...filters, ...page })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminKeys.user(id),
    queryFn: () => adminFetch<AdminUserDetail>(`/users/${id}`),
  });
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: adminKeys.admins,
    queryFn: () => adminFetch<AdminAccount[]>("/admins"),
  });
}

export function useAdminPayments(status: AdminPayment["status"] | "all") {
  return useQuery({
    queryKey: adminKeys.payments(status),
    queryFn: () =>
      adminFetch<AdminPayment[]>(
        `/payments${queryString({ status: status === "all" ? undefined : status })}`,
      ),
  });
}

export function useAdminSessions() {
  return useQuery({
    queryKey: adminKeys.sessions,
    queryFn: () => adminFetch<AdminSession[]>("/auth/sessions"),
  });
}

/**
 * A POST/PUT/DELETE on the admin API: toast on success or error, then refresh the admin
 * queries (lists, details, dashboard counts).
 */
export function useAdminAction<TVars>(
  request: (vars: TVars) => Promise<unknown>,
  success: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      toast.success(success);
      return queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
    onError: (error) => toast.error(adminErrorMessage(error)),
  });
}

export { post, put };
