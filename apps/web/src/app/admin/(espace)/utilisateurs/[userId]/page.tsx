"use client";

import { ArrowLeft, Ban, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/app/page-header";
import {
  ErrorState,
  FullScreenLoader,
  InlineAlert,
} from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { post } from "@/features/admin/admin-api";
import {
  AuditList,
  formatDate,
  ReasonDialog,
  SectionCard,
  UserStatusBadge,
} from "@/features/admin/admin-ui";
import { useAdminAction, useAdminUser } from "@/features/admin/use-admin";
import { ROLE_LABELS } from "@/features/shop/roles";

/** F-23: a seller account, its shops, and suspend / reactivate. */
export default function AdminUserPage() {
  const { userId } = useParams<{ userId: string }>();
  const user = useAdminUser(userId);
  const [dialog, setDialog] = useState<"suspend" | "reactivate" | null>(null);
  const close = () => setDialog(null);

  const suspend = useAdminAction(
    (v: { reason?: string; text: string }) =>
      post(`/users/${userId}/suspend`, {
        reason: v.reason,
        details: v.text || null,
      }),
    "Compte suspendu",
  );
  const reactivate = useAdminAction(
    (v: { text: string }) =>
      post(`/users/${userId}/reactivate`, { details: v.text || null }),
    "Compte réactivé",
  );

  if (user.isError)
    return <ErrorState error={user.error} onRetry={() => user.refetch()} />;
  if (!user.data) return <FullScreenLoader />;
  const u = user.data;
  const label = u.name ?? u.email ?? "Utilisateur";

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 self-start" asChild>
        <Link href="/admin/utilisateurs">
          <ArrowLeft /> Utilisateurs
        </Link>
      </Button>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {label}
            <UserStatusBadge suspendedAt={u.suspendedAt} />
          </span>
        }
        description={`${u.email ?? "Sans email"} · inscrit le ${formatDate(u.createdAt)}`}
        actions={
          u.suspendedAt ? (
            <Button onClick={() => setDialog("reactivate")}>
              <RotateCcw /> Réactiver le compte
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setDialog("suspend")}>
              <Ban /> Suspendre le compte
            </Button>
          )
        }
      />

      {u.suspendedAt && (
        <InlineAlert tone="danger" icon={Ban}>
          Compte suspendu le {formatDate(u.suspendedAt)} : il ne peut plus
          utiliser l’app. Ses boutiques continuent de fonctionner pour les
          autres membres.
          {u.suspendedReason && <> Motif : {u.suspendedReason}</>}
        </InlineAlert>
      )}

      <SectionCard title={`Boutiques (${u.shops.length})`}>
        {u.shops.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">
            Membre d’aucune boutique.
          </p>
        ) : (
          <ul className="divide-y">
            {u.shops.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-5 py-3 text-sm"
              >
                <Link
                  href={`/admin/boutiques/${s.id}`}
                  className="flex-1 font-medium hover:underline"
                >
                  {s.name}
                </Link>
                {s.status === "SUSPENDED" && (
                  <Badge variant="danger">Suspendue</Badge>
                )}
                <Badge variant="secondary">{ROLE_LABELS[s.role]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Historique des actions admin">
        <AuditList entries={u.actions} />
      </SectionCard>

      <ReasonDialog
        open={dialog === "suspend"}
        onOpenChange={(o) => !o && close()}
        title={`Suspendre le compte de ${label} ?`}
        description="Il ne pourra plus utiliser l’app (mobile et web). Rien n’est supprimé."
        confirmLabel="Suspendre"
        destructive
        pending={suspend.isPending}
        onConfirm={(v) => suspend.mutate(v, { onSuccess: close })}
      />
      <ReasonDialog
        open={dialog === "reactivate"}
        onOpenChange={(o) => !o && close()}
        title={`Réactiver le compte de ${label} ?`}
        requireReason={false}
        confirmLabel="Réactiver"
        pending={reactivate.isPending}
        onConfirm={(v) => reactivate.mutate(v, { onSuccess: close })}
      />
    </>
  );
}
