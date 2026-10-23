"use client";

import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  UserCheck,
  UserX,
} from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Field } from "@/components/app/field";
import { PageHeader } from "@/components/app/page-header";
import { ErrorState, TableSkeletonRows } from "@/components/app/states";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { post, put, type AdminAccount } from "@/features/admin/admin-api";
import { formatDate } from "@/features/admin/admin-ui";
import {
  useAdminAccounts,
  useAdminAction,
  useAdminMe,
} from "@/features/admin/use-admin";
import { formatDateTime } from "@/lib/format";

/** A readable temporary password (16 chars), to hand over to the new admin. */
function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

type Confirm = {
  kind: "disable" | "enable" | "mfa-reset" | "mfa-optional" | "mfa-required";
  admin: AdminAccount;
} | null;

/** F-25: admin accounts. Actions on one's own account are not offered (API refuses them). */
export default function AdminAccountsPage() {
  const accounts = useAdminAccounts();
  const me = useAdminMe().data;
  const [createOpen, setCreateOpen] = useState(false);
  const [resetFor, setResetFor] = useState<AdminAccount | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const action = useAdminAction(({ kind, admin }: NonNullable<Confirm>) => {
    const base = `/admins/${admin.id}`;
    if (kind === "disable") return post(`${base}/disable`);
    if (kind === "enable") return post(`${base}/enable`);
    if (kind === "mfa-reset") return post(`${base}/mfa/reset`);
    return put(`${base}/mfa-required`, { required: kind === "mfa-required" });
  }, "Compte admin mis à jour");

  const confirmText: Record<
    NonNullable<Confirm>["kind"],
    { title: string; description: string; label: string }
  > = {
    disable: {
      title: "Désactiver cet admin ?",
      description:
        "Il est déconnecté tout de suite et ne peut plus se connecter.",
      label: "Désactiver",
    },
    enable: {
      title: "Réactiver cet admin ?",
      description: "Il pourra de nouveau se connecter.",
      label: "Réactiver",
    },
    "mfa-reset": {
      title: "Réinitialiser sa MFA ?",
      description:
        "Téléphone perdu : il scannera un nouveau QR code à sa prochaine connexion. Ses codes de secours ne marchent plus.",
      label: "Réinitialiser",
    },
    "mfa-optional": {
      title: "Rendre la MFA facultative ?",
      description:
        "Déconseillé : son mot de passe suffira pour se connecter s’il n’a pas activé la MFA.",
      label: "Rendre facultative",
    },
    "mfa-required": {
      title: "Rendre la MFA obligatoire ?",
      description:
        "Il devra scanner le QR code à sa prochaine connexion s’il ne l’a pas encore fait.",
      label: "Rendre obligatoire",
    },
  };

  return (
    <>
      <PageHeader
        refresh
        title="Admins"
        description="L’équipe Flow.Co qui a accès à cet espace."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> Ajouter un admin
          </Button>
        }
      />
      {accounts.isError && (
        <ErrorState error={accounts.error} onRetry={() => accounts.refetch()} />
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Admin</TableHead>
              <TableHead>État</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.isPending && <TableSkeletonRows columns={6} rows={3} />}
            {accounts.data?.map((a) => {
              const self = a.id === me?.id;
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <span className="block font-medium">
                      {a.name}{" "}
                      {self && (
                        <span className="text-xs text-muted-foreground">
                          (vous)
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      @{a.username}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex flex-wrap gap-1">
                      {a.disabledAt ? (
                        <Badge variant="danger">Désactivé</Badge>
                      ) : (
                        <Badge variant="success">Actif</Badge>
                      )}
                      {a.mustChangePassword && (
                        <Badge variant="warning">Mot de passe provisoire</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex flex-wrap gap-1">
                      {a.mfaEnabled ? (
                        <Badge variant="success">Activée</Badge>
                      ) : (
                        <Badge variant="outline">À configurer</Badge>
                      )}
                      {!a.mfaRequired && (
                        <Badge variant="warning">Facultative</Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "Jamais"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(a.createdAt)}
                  </TableCell>
                  <TableCell>
                    {!self && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions pour ${a.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuItem onSelect={() => setResetFor(a)}>
                            <KeyRound /> Réinitialiser le mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              setConfirm({ kind: "mfa-reset", admin: a })
                            }
                          >
                            <Smartphone /> Réinitialiser la MFA
                          </DropdownMenuItem>
                          {a.mfaRequired ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                setConfirm({ kind: "mfa-optional", admin: a })
                              }
                            >
                              <ShieldOff /> Rendre la MFA facultative
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                setConfirm({ kind: "mfa-required", admin: a })
                              }
                            >
                              <ShieldCheck /> Rendre la MFA obligatoire
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {a.disabledAt ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                setConfirm({ kind: "enable", admin: a })
                              }
                            >
                              <UserCheck /> Réactiver
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-danger focus:text-danger"
                              onSelect={() =>
                                setConfirm({ kind: "disable", admin: a })
                              }
                            >
                              <UserX /> Désactiver
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <CreateAdminDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ResetPasswordDialog admin={resetFor} onClose={() => setResetFor(null)} />
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirmText[confirm.kind].title}
          description={`${confirm.admin.name} (@${confirm.admin.username}). ${confirmText[confirm.kind].description}`}
          confirmLabel={confirmText[confirm.kind].label}
          destructive={
            confirm.kind !== "enable" && confirm.kind !== "mfa-required"
          }
          pending={action.isPending}
          onConfirm={() =>
            action.mutate(confirm, { onSuccess: () => setConfirm(null) })
          }
        />
      )}
    </>
  );
}

function PasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field
      label="Mot de passe provisoire"
      hint="12 caractères minimum. À transmettre en main propre ; il devra le changer."
    >
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(generatePassword())}
        >
          Générer
        </Button>
      </div>
    </Field>
  );
}

function CreateAdminDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState(generatePassword);
  const create = useAdminAction(
    () =>
      post("/admins", {
        username: username.trim().toLowerCase(),
        name: name.trim(),
        password,
      }),
    "Admin créé",
  );
  const close = () => {
    onOpenChange(false);
    setUsername("");
    setName("");
    setPassword(generatePassword());
  };
  const valid =
    /^[a-z0-9._-]{3,50}$/.test(username.trim().toLowerCase()) &&
    name.trim() &&
    password.length >= 12;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un admin</DialogTitle>
          <DialogDescription>
            À sa première connexion, il change ce mot de passe et active la MFA
            (QR code).
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field label="Identifiant" hint="Lettres minuscules, chiffres, . _ -">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
            />
          </Field>
          <Field label="Nom affiché">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <PasswordField value={password} onChange={setPassword} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Retour
          </Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() => create.mutate(undefined, { onSuccess: close })}
          >
            {create.isPending && <Loader2 className="animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  admin,
  onClose,
}: {
  admin: AdminAccount | null;
  onClose: () => void;
}) {
  const [password, setPassword] = useState(generatePassword);
  const reset = useAdminAction(
    () => post(`/admins/${admin!.id}/reset-password`, { password }),
    "Mot de passe réinitialisé",
  );
  return (
    <Dialog open={admin !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau mot de passe pour {admin?.name}</DialogTitle>
          <DialogDescription>
            Ses sessions sont fermées ; il devra changer ce mot de passe.
          </DialogDescription>
        </DialogHeader>
        <PasswordField value={password} onChange={setPassword} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Retour
          </Button>
          <Button
            disabled={password.length < 12 || reset.isPending}
            onClick={() =>
              reset.mutate(undefined, {
                onSuccess: () => {
                  onClose();
                  setPassword(generatePassword());
                },
              })
            }
          >
            {reset.isPending && <Loader2 className="animate-spin" />}
            Réinitialiser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
