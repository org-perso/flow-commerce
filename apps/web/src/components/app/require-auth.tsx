"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { FullScreenLoader } from "@/components/app/states";
import { useAuth } from "@/features/auth/auth-provider";

/** Renders children only for a signed-in user; otherwise goes to the sign-in page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/connexion");
  }, [loading, user, router]);

  if (loading || !user) return <FullScreenLoader />;
  return <>{children}</>;
}
