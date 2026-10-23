"use client";

import { Loader2, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Field } from "@/components/app/field";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  ACTION_REASONS,
  type ActionReason,
  type AuditEntry,
  type ShopStatus,
} from "./admin-api";
import { ACTION_LABELS, reasonLabel, REASON_LABELS } from "./labels";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card className="gap-2 px-5 py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon
          className={cn(
            "size-4",
            tone === "warning" && "text-gold-ink",
            tone === "danger" && "text-danger",
          )}
        />
        {label}
      </div>
      <p className="tabular text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function ShopStatusBadges({
  status,
  flaggedAt,
}: {
  status: ShopStatus;
  flaggedAt: string | null;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {status === "SUSPENDED" ? (
        <Badge variant="danger">Suspendue</Badge>
      ) : (
        <Badge variant="success">Active</Badge>
      )}
      {flaggedAt && <Badge variant="warning">Signalée</Badge>}
    </span>
  );
}

export function UserStatusBadge({
  suspendedAt,
}: {
  suspendedAt: string | null;
}) {
  return suspendedAt ? (
    <Badge variant="danger">Suspendu</Badge>
  ) : (
    <Badge variant="success">Actif</Badge>
  );
}

/** "12 sept. 2026" in Madagascar time. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Indian/Antananarivo",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export type ReasonActionValues = {
  reason: ActionReason;
  details: string | null;
};

/**
 * Every admin action on a shop or a user asks for a reason (and optional details), or a
 * message for a warning. `requireReason: false` for "lift" actions (reactivate, unflag).
 */
export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  requireReason = true,
  messageLabel,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  requireReason?: boolean;
  /** Turns the free text into a required message (warning sent to the owners). */
  messageLabel?: string;
  pending?: boolean;
  onConfirm: (values: { reason?: ActionReason; text: string }) => void;
}) {
  const [reason, setReason] = useState<ActionReason | "">("");
  const [text, setText] = useState("");
  const valid =
    (!requireReason || reason !== "") && (!messageLabel || text.trim() !== "");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setReason("");
          setText("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {requireReason && (
            <Field label="Motif">
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as ActionReason)}
              >
                <SelectTrigger aria-label="Motif">
                  <SelectValue placeholder="Choisir un motif" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REASON_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field
            label={messageLabel ?? "Précisions (facultatif)"}
            hint={
              messageLabel
                ? "Visible par le(s) propriétaire(s)."
                : "Visible des admins seulement."
            }
          >
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={messageLabel ? 2000 : 1000}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Retour
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!valid || pending}
            onClick={() =>
              onConfirm({ reason: reason || undefined, text: text.trim() })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** RG-72: who did what, when and why. */
export function AuditList({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-muted-foreground">
        Aucune action admin pour l’instant.
      </p>
    );
  }
  return (
    <ol className="divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="px-5 py-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">
              {ACTION_LABELS[entry.action] ?? entry.action}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(entry.createdAt)} · {entry.admin.name}
            </span>
          </div>
          {(entry.reason || entry.details) && (
            <p className="mt-0.5 text-muted-foreground">
              {[reasonLabel(entry.reason), entry.details]
                .filter(Boolean)
                .join(" — ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function SectionCard({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <h2 className="font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </Card>
  );
}
