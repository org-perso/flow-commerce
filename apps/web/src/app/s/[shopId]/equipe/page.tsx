"use client";

import {
  Copy,
  KeyRound,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  UserMinus,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/app/avatar";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PageHeader } from "@/components/app/page-header";
import {
  EmptyState,
  ErrorState,
  TableSkeletonRows,
} from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMe } from "@/features/me/use-me";
import {
  canManageRole,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLES,
  type Role,
} from "@/features/shop/roles";
import { useCan, useShop } from "@/features/shop/shop-context";
import {
  expiresIn,
  invitationMessage,
  memberName,
} from "@/features/team/format";
import type {
  InvitableRole,
  Invitation,
  Member,
} from "@/features/team/team-api";
import {
  useChangeMemberRole,
  useCreateInvitation,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
} from "@/features/team/use-team";
import { apiErrorMessage } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

const INVITABLE: InvitableRole[] = ["MANAGER", "CM", "DRIVER"];

function InviteDialog({ onClose }: { onClose: () => void }) {
  const shop = useShop();
  const create = useCreateInvitation();
  const allowed = INVITABLE.filter((r) => canManageRole(shop.role, r));
  const [role, setRole] = useState<InvitableRole>(
    allowed.includes("CM") ? "CM" : allowed[0]!,
  );
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  const generate = async () => {
    try {
      setInvitation(await create.mutateAsync(role));
    } catch {
      // Shown below.
    }
  };
  const message = invitation
    ? invitationMessage(shop.name, invitation.role, invitation.code)
    : "";
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error("Copie impossible : sélectionnez le texte à la main.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter dans l’équipe</DialogTitle>
          <DialogDescription>
            Un code à usage unique, valable 7 jours, à envoyer à la personne.
          </DialogDescription>
        </DialogHeader>
        {!invitation ? (
          <>
            {create.isError && <ErrorState error={create.error} />}
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as InvitableRole)}
              aria-label="Rôle"
            >
              {allowed.map((r) => (
                <RadioCard key={r} value={r}>
                  <span className="text-sm font-semibold">
                    {ROLE_LABELS[r]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {ROLE_DESCRIPTIONS[r]}
                  </span>
                </RadioCard>
              ))}
            </RadioGroup>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button onClick={generate} disabled={create.isPending}>
                {create.isPending && <Loader2 className="animate-spin" />}
                Créer le code
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-navy-soft py-6">
              <span className="text-xs font-medium text-muted-foreground">
                Code pour un {ROLE_LABELS[invitation.role].toLowerCase()}
              </span>
              <span className="font-mono text-4xl font-bold tracking-[0.3em] text-navy">
                {invitation.code}
              </span>
              <span className="text-xs text-muted-foreground">
                {expiresIn(invitation.expiresAt)}
              </span>
            </div>
            <p className="rounded-lg border bg-muted/40 p-3 text-sm">
              {message}
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => copy(invitation.code, "Code copié.")}
              >
                <Copy /> Copier le code
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> Partager sur WhatsApp
                </a>
              </Button>
              <Button onClick={() => copy(message, "Message copié.")}>
                Copier le message
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RoleCell({ member, isMe }: { member: Member; isMe: boolean }) {
  const shop = useShop();
  const change = useChangeMemberRole();
  const editable = !isMe && canManageRole(shop.role, member.role);
  if (!editable)
    return (
      <Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
        {ROLE_LABELS[member.role]}
      </Badge>
    );
  const options = ROLES.filter((r) => canManageRole(shop.role, r));
  return (
    <Select
      value={member.role}
      disabled={change.isPending}
      onValueChange={async (role) => {
        try {
          await change.mutateAsync({
            userId: member.userId,
            role: role as Role,
          });
          toast.success(
            `${memberName(member)} est maintenant ${ROLE_LABELS[role as Role].toLowerCase()}.`,
          );
        } catch (e) {
          toast.error(apiErrorMessage(e));
        }
      }}
    >
      <SelectTrigger
        className="h-8 w-48"
        aria-label={`Rôle de ${memberName(member)}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function TeamPage() {
  const shop = useShop();
  const router = useRouter();
  const allowed = useCan("team");
  const me = useMe();
  const members = useMembers();
  const invitations = useInvitations(allowed);
  const remove = useRemoveMember();
  const revoke = useRevokeInvitation();
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);

  useEffect(() => {
    if (!allowed) router.replace(`/s/${shop.id}/commandes`);
  }, [allowed, router, shop.id]);
  if (!allowed) return null;

  const sorted = [...(members.data ?? [])].sort(
    (a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role),
  );

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Qui fait quoi dans la boutique. Chacun apparaît sous son pseudo, jamais son email."
        actions={
          <>
            <Button onClick={() => setInviting(true)}>
              <Plus /> Inviter
            </Button>
          </>
        }
      />
      {members.isError && (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      )}
      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>
            Membres{" "}
            {members.data && (
              <span className="text-muted-foreground">
                · {members.data.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Depuis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.isPending && <TableSkeletonRows columns={4} rows={4} />}
            {sorted.map((m) => {
              const isMe = m.userId === me.data?.id;
              const name = memberName(m);
              return (
                <TableRow key={m.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={name} />
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {name}
                          {isMe && (
                            <span className="ml-1 text-muted-foreground">
                              (vous)
                            </span>
                          )}
                        </span>
                        {m.nickname && (m.name || m.email) && (
                          <span className="text-xs text-muted-foreground">
                            {m.name ?? m.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleCell member={m} isMe={isMe} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(m.joinedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isMe && canManageRole(shop.role, m.role) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:bg-danger-soft hover:text-danger"
                        onClick={() => setRemoving(m)}
                      >
                        <UserMinus /> Retirer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="pb-4">
          <CardTitle>Codes en cours</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setInviting(true)}>
            <KeyRound /> Nouveau code
          </Button>
        </CardHeader>
        {invitations.isError && (
          <ErrorState
            error={invitations.error}
            onRetry={() => invitations.refetch()}
            className="mx-5 mb-4"
          />
        )}
        {invitations.data?.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Aucun code en cours"
            description="Créez un code pour inviter un gérant, un CM ou un livreur."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Validité</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.isPending && (
                <TableSkeletonRows columns={4} rows={2} />
              )}
              {invitations.data?.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-bold tracking-widest">
                    {inv.code}
                  </TableCell>
                  <TableCell>{ROLE_LABELS[inv.role]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {expiresIn(inv.expiresAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revoke.isPending}
                      onClick={async () => {
                        try {
                          await revoke.mutateAsync(inv.id);
                          toast.success(`Code ${inv.code} annulé.`);
                        } catch (e) {
                          toast.error(apiErrorMessage(e));
                        }
                      }}
                    >
                      <Trash2 /> Annuler
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Retirer ${removing ? memberName(removing) : ""} de la boutique ?`}
        description="Ce membre n’aura plus accès à la boutique. Vous pourrez l’inviter à nouveau."
        confirmLabel="Retirer"
        pending={remove.isPending}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync(removing.userId);
            toast.success(`${memberName(removing)} a été retiré.`);
            setRemoving(null);
          } catch (e) {
            toast.error(apiErrorMessage(e));
          }
        }}
      />
    </>
  );
}
