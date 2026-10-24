"use client";

import { Check, CreditCard, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Field } from "@/components/app/field";
import { PageHeader } from "@/components/app/page-header";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { post, type AdminPayment } from "@/features/admin/admin-api";
import { OPERATOR_LABELS, PLAN_LABELS } from "@/features/admin/labels";
import { useAdminAction, useAdminPayments } from "@/features/admin/use-admin";
import { formatAr, formatDateTime, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "PENDING", label: "À valider" },
  { value: "VALIDATED", label: "Validés" },
  { value: "REJECTED", label: "Refusés" },
  { value: "all", label: "Tous" },
] as const;

const STATUS: Record<
  AdminPayment["status"],
  { label: string; variant: "outline" | "success" | "danger" }
> = {
  PENDING: { label: "À valider", variant: "outline" },
  VALIDATED: { label: "Validé", variant: "success" },
  REJECTED: { label: "Refusé", variant: "danger" },
};

/** F-24: Mobile Money payments declared by the owners, checked against the operator account. */
export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("PENDING");
  const payments = useAdminPayments(tab);
  const [validating, setValidating] = useState<AdminPayment | null>(null);
  const [rejecting, setRejecting] = useState<AdminPayment | null>(null);
  const [reason, setReason] = useState("");

  const validate = useAdminAction(
    (p: AdminPayment) => post(`/payments/${p.id}/validate`),
    "Paiement validé : la formule est activée",
  );
  const reject = useAdminAction(
    ({ p, why }: { p: AdminPayment; why: string }) =>
      post(`/payments/${p.id}/reject`, { reason: why }),
    "Paiement refusé",
  );
  const rows = payments.data ?? [];

  return (
    <>
      <PageHeader
        refresh
        title="Paiements"
        description="Vérifiez chaque référence sur le compte Mobile Money avant de valider."
      />
      <div className="flex gap-1 rounded-lg bg-muted p-1 self-start">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === t.value
                ? "bg-card shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {payments.isError && (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boutique</TableHead>
              <TableHead>Formule</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Opérateur</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Déclaré le</TableHead>
              <TableHead>État</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.isPending && <TableSkeletonRows columns={8} rows={4} />}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link
                    href={`/admin/boutiques/${p.shop.id}`}
                    className="font-medium hover:underline"
                  >
                    {p.shop.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {PLAN_LABELS[p.plan]} · {p.months} mois
                </TableCell>
                <TableCell className="tabular text-right font-medium">
                  {formatAr(p.amount)}
                </TableCell>
                <TableCell>
                  {OPERATOR_LABELS[p.operator]}
                  {p.payerPhone && (
                    <span className="block text-xs text-muted-foreground">
                      {formatPhone(p.payerPhone)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {p.reference}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(p.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS[p.status].variant}>
                    {STATUS[p.status].label}
                  </Badge>
                  {p.rejectReason && (
                    <span className="block text-xs text-danger">
                      {p.rejectReason}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "PENDING" && (
                    <span className="inline-flex gap-1.5">
                      <Button size="sm" onClick={() => setValidating(p)}>
                        <Check /> Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejecting(p)}
                      >
                        <X /> Refuser
                      </Button>
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {payments.isSuccess && rows.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title={
              tab === "PENDING" ? "Aucun paiement à valider" : "Aucun paiement"
            }
          />
        )}
      </Card>

      {validating && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setValidating(null)}
          title="Valider ce paiement ?"
          description={`${validating.shop.name} · ${PLAN_LABELS[validating.plan]} ${validating.months} mois · ${formatAr(validating.amount)} · réf. ${validating.reference}. Vérifiez que l’argent est bien arrivé.`}
          confirmLabel="Valider"
          destructive={false}
          pending={validate.isPending}
          onConfirm={() =>
            validate.mutate(validating, {
              onSuccess: () => setValidating(null),
            })
          }
        />
      )}
      <Dialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser ce paiement ?</DialogTitle>
            <DialogDescription>
              La formule provisoire s’arrête tout de suite ; le propriétaire
              voit le motif.
            </DialogDescription>
          </DialogHeader>
          <Field label="Motif">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. Paiement non reçu, montant incorrect…"
              rows={3}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Retour
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || reject.isPending}
              onClick={() =>
                rejecting &&
                reject.mutate(
                  { p: rejecting, why: reason.trim() },
                  {
                    onSuccess: () => {
                      setRejecting(null);
                      setReason("");
                    },
                  },
                )
              }
            >
              {reject.isPending && <Loader2 className="animate-spin" />}
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
