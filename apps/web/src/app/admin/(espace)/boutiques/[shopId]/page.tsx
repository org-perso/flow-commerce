"use client";

import {
  ArrowLeft,
  Ban,
  Flag,
  FlagOff,
  Loader2,
  MessageSquareWarning,
  RotateCcw,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { post } from "@/features/admin/admin-api";
import {
  AuditList,
  formatDate,
  ReasonDialog,
  SectionCard,
  ShopStatusBadges,
} from "@/features/admin/admin-ui";
import { PLAN_LABELS, reasonLabel } from "@/features/admin/labels";
import {
  useAdminAction,
  useAdminShop,
  useAdminShopActions,
} from "@/features/admin/use-admin";
import { ROLE_LABELS } from "@/features/shop/roles";
import { formatDateTime } from "@/lib/format";

type DialogName = "warn" | "flag" | "unflag" | "suspend" | "reactivate" | null;

/** F-21 / F-22: one shop, its usage figures (never its data) and the admin actions. */
export default function AdminShopPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const shop = useAdminShop(shopId);
  const actions = useAdminShopActions(shopId);
  const [dialog, setDialog] = useState<DialogName>(null);
  const [note, setNote] = useState("");

  const base = `/shops/${shopId}`;
  const close = () => setDialog(null);
  const warn = useAdminAction(
    (v: { reason?: string; text: string }) =>
      post(`${base}/warn`, { reason: v.reason, message: v.text }),
    "Avertissement envoyé aux propriétaires",
  );
  const flag = useAdminAction(
    (v: { reason?: string; text: string }) =>
      post(`${base}/flag`, { reason: v.reason, details: v.text || null }),
    "Boutique signalée",
  );
  const unflag = useAdminAction(
    (v: { text: string }) =>
      post(`${base}/unflag`, { details: v.text || null }),
    "Signalement retiré",
  );
  const suspend = useAdminAction(
    (v: { reason?: string; text: string }) =>
      post(`${base}/suspend`, { reason: v.reason, details: v.text || null }),
    "Boutique suspendue",
  );
  const reactivate = useAdminAction(
    (v: { text: string }) =>
      post(`${base}/reactivate`, { details: v.text || null }),
    "Boutique réactivée",
  );
  const addNote = useAdminAction(
    (body: string) => post(`${base}/notes`, { body }),
    "Note ajoutée",
  );

  if (shop.isError) {
    return <ErrorState error={shop.error} onRetry={() => shop.refetch()} />;
  }
  if (!shop.data) return <FullScreenLoader />;
  const s = shop.data;
  const suspended = s.status === "SUSPENDED";

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 self-start" asChild>
        <Link href="/admin/boutiques">
          <ArrowLeft /> Boutiques
        </Link>
      </Button>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {s.name}
            <ShopStatusBadges status={s.status} flaggedAt={s.flaggedAt} />
          </span>
        }
        description={`Créée le ${formatDate(s.createdAt)} · Formule ${PLAN_LABELS[s.plan]}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setDialog("warn")}>
              <MessageSquareWarning /> Avertir
            </Button>
            {s.flaggedAt ? (
              <Button variant="outline" onClick={() => setDialog("unflag")}>
                <FlagOff /> Retirer le signalement
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setDialog("flag")}>
                <Flag /> Signaler
              </Button>
            )}
            {suspended ? (
              <Button onClick={() => setDialog("reactivate")}>
                <RotateCcw /> Réactiver
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setDialog("suspend")}
              >
                <Ban /> Suspendre
              </Button>
            )}
          </>
        }
      />

      {suspended && (
        <InlineAlert tone="danger" icon={Ban}>
          Boutique suspendue : ses membres peuvent consulter, mais plus rien
          créer ni modifier.
          {s.suspendedReason && <> Motif : {s.suspendedReason}</>}
        </InlineAlert>
      )}
      {s.flaggedAt && (
        <InlineAlert icon={Flag}>
          Signalée le {formatDate(s.flaggedAt)} (visible des admins seulement)
          {s.flagReason && <> : {reasonLabel(s.flagReason) ?? s.flagReason}</>}
        </InlineAlert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Figure label="Commandes" value={s.ordersCount} />
        <Figure label="Commandes (30 j)" value={s.orders30Days} />
        <Figure label="Produits" value={s.counts.products} />
        <Figure label="Clients" value={s.counts.customers} />
        <Figure label="Dépenses saisies" value={s.counts.expenses} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title={`Membres (${s.members.length})`}>
          <ul className="divide-y">
            {s.members.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-3 px-5 py-3 text-sm"
              >
                <Link
                  href={`/admin/utilisateurs/${m.userId}`}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <span className="block truncate font-medium">
                    {m.name ?? m.email ?? "—"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {m.email}
                  </span>
                </Link>
                <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Commandes par mois">
          {s.ordersByMonth.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              Aucune commande sur les 6 derniers mois.
            </p>
          ) : (
            <ul className="divide-y">
              {s.ordersByMonth.map((m) => (
                <li
                  key={m.month}
                  className="flex justify-between px-5 py-2.5 text-sm"
                >
                  <span>{m.month.split("-").reverse().join("/")}</span>
                  <span className="tabular font-medium">{m.orders}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Notes internes">
          <form
            className="flex flex-col gap-2 border-b px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              addNote.mutate(note.trim(), { onSuccess: () => setNote("") });
            }}
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Visible des admins seulement"
              rows={2}
              maxLength={5000}
            />
            <Button
              type="submit"
              size="sm"
              className="self-end"
              disabled={!note.trim() || addNote.isPending}
            >
              {addNote.isPending && <Loader2 className="animate-spin" />}
              Ajouter la note
            </Button>
          </form>
          <ul className="divide-y">
            {s.notes.map((n) => (
              <li key={n.id} className="px-5 py-3 text-sm">
                <p className="whitespace-pre-line">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.admin.name} · {formatDateTime(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Avertissements envoyés">
          {s.notices.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              Aucun avertissement.
            </p>
          ) : (
            <ul className="divide-y">
              {s.notices.map((n) => (
                <li key={n.id} className="px-5 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{reasonLabel(n.reason)}</span>
                    {n.readAt ? (
                      <Badge variant="success">
                        Lu le {formatDate(n.readAt)}
                      </Badge>
                    ) : (
                      <Badge variant="warning">Non lu</Badge>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Historique des actions admin">
        <AuditList entries={actions.data ?? []} />
      </SectionCard>

      <ReasonDialog
        open={dialog === "warn"}
        onOpenChange={(o) => !o && close()}
        title="Avertir les propriétaires"
        description="Le message s’affiche dans leur app jusqu’à ce qu’ils le lisent."
        messageLabel="Message"
        confirmLabel="Envoyer"
        pending={warn.isPending}
        onConfirm={(v) => warn.mutate(v, { onSuccess: close })}
      />
      <ReasonDialog
        open={dialog === "flag"}
        onOpenChange={(o) => !o && close()}
        title="Signaler la boutique"
        description="À surveiller : le vendeur n’en voit rien."
        confirmLabel="Signaler"
        pending={flag.isPending}
        onConfirm={(v) => flag.mutate(v, { onSuccess: close })}
      />
      <ReasonDialog
        open={dialog === "unflag"}
        onOpenChange={(o) => !o && close()}
        title="Retirer le signalement"
        requireReason={false}
        confirmLabel="Retirer"
        pending={unflag.isPending}
        onConfirm={(v) => unflag.mutate(v, { onSuccess: close })}
      />
      <ReasonDialog
        open={dialog === "suspend"}
        onOpenChange={(o) => !o && close()}
        title={`Suspendre ${s.name} ?`}
        description="Tous ses membres passent en lecture seule. Aucune donnée n’est supprimée."
        confirmLabel="Suspendre"
        destructive
        pending={suspend.isPending}
        onConfirm={(v) => suspend.mutate(v, { onSuccess: close })}
      />
      <ReasonDialog
        open={dialog === "reactivate"}
        onOpenChange={(o) => !o && close()}
        title={`Réactiver ${s.name} ?`}
        requireReason={false}
        confirmLabel="Réactiver"
        pending={reactivate.isPending}
        onConfirm={(v) => reactivate.mutate(v, { onSuccess: close })}
      />
    </>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="tabular text-2xl font-bold">{value}</p>
    </div>
  );
}
