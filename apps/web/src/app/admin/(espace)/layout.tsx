"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { ErrorState, FullScreenLoader } from "@/components/app/states";
import { isUnauthorized } from "@/features/admin/admin-api";
import { AdminShell } from "@/features/admin/admin-shell";
import { useAdminMe } from "@/features/admin/use-admin";

/**
 * Signed-in admin pages. The API decides (cookie session): signed out → sign-in page,
 * temporary password → "Mon compte" until it is changed.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const me = useAdminMe();
  const router = useRouter();
  const pathname = usePathname();
  const signedOut = me.isError && isUnauthorized(me.error);
  const mustChange =
    me.data?.mustChangePassword && pathname !== "/admin/compte";

  useEffect(() => {
    if (signedOut) router.replace("/admin/connexion");
    else if (mustChange) router.replace("/admin/compte");
  }, [signedOut, mustChange, router]);

  if (me.isError && !signedOut) {
    return (
      <div className="mx-auto max-w-md p-6 pt-24">
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      </div>
    );
  }
  if (!me.data || mustChange) return <FullScreenLoader />;
  return <AdminShell admin={me.data}>{children}</AdminShell>;
}
