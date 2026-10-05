"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Field } from "@/components/app/field";
import { PageHeader } from "@/components/app/page-header";
import { ErrorState, InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { authErrorMessage } from "@/features/auth/auth-errors";
import {
  deleteMyAccount,
  signOut,
  usesPassword,
} from "@/features/auth/auth-service";
import { PRIVACY_POLICY_URL } from "@/features/auth/terms";
import { useMe, useUpdateMe } from "@/features/me/use-me";
import { ROLE_LABELS } from "@/features/shop/roles";
import { useCan, useShop } from "@/features/shop/shop-context";
import { ShopForm } from "@/features/shop/shop-form";
import { useSetMyNickname, useUpdateShop } from "@/features/shop/use-shops";
import { useLeaveShop } from "@/features/team/use-team";
import { ApiError, apiErrorMessage } from "@/lib/api-client";

const CONFIRM_WORD = "SUPPRIMER";

function NicknameCard() {
  const shop = useShop();
  const setNickname = useSetMyNickname(shop.id);
  const [value, setValue] = useState(shop.nickname ?? "");
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await setNickname.mutateAsync(value.trim() || null);
      toast.success("Pseudo enregistré.");
    } catch {
      // Shown below.
    }
  };
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>Mon pseudo dans la boutique</CardTitle>
        <CardDescription>
          C’est ce que verra l’équipe (jamais votre email). Unique dans la
          boutique ; vide : le nom de votre compte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={save}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <Field className="flex-1">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex. Rado moto"
              maxLength={50}
              aria-label="Pseudo"
            />
          </Field>
          <Button type="submit" disabled={setNickname.isPending}>
            {setNickname.isPending && <Loader2 className="animate-spin" />}
            Enregistrer
          </Button>
        </form>
        {setNickname.isError && (
          <ErrorState error={setNickname.error} className="mt-3" />
        )}
      </CardContent>
    </Card>
  );
}

function AccountNameField() {
  const me = useMe();
  const update = useUpdateMe();
  const [value, setValue] = useState<string | null>(null);
  const name = value ?? me.data?.name ?? "";
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await update.mutateAsync({ name: name.trim() || null });
      setValue(null);
      toast.success("Nom enregistré.");
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };
  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <Field
        label="Nom du compte"
        htmlFor="account-name"
        hint="Utilisé quand vous n’avez pas de pseudo."
        className="flex-1"
      >
        <Input
          id="account-name"
          value={name}
          onChange={(e) => setValue(e.target.value)}
          maxLength={100}
          disabled={!me.data}
        />
      </Field>
      <Button
        type="submit"
        variant="outline"
        disabled={update.isPending || value === null}
        className="sm:mb-5"
      >
        {update.isPending && <Loader2 className="animate-spin" />}
        Enregistrer
      </Button>
    </form>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const password = usesPassword();
  const [word, setWord] = useState("");
  const [secret, setSecret] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const ready =
    word.trim().toUpperCase() === CONFIRM_WORD &&
    (!password || secret.length > 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setPending(true);
    setError(undefined);
    try {
      await deleteMyAccount(queryClient, password ? secret : undefined);
      toast.success("Votre compte a été supprimé.");
      router.replace("/connexion");
    } catch (e) {
      setError(
        e instanceof ApiError || e instanceof TypeError
          ? apiErrorMessage(e)
          : authErrorMessage(e),
      );
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer mon compte</DialogTitle>
          <DialogDescription>
            Votre compte et vos données sont supprimés définitivement, ainsi que
            les boutiques dont vous êtes le seul propriétaire (commandes, stock,
            clients, photos). Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <InlineAlert tone="danger">{error}</InlineAlert>}
          <Field
            label={`Tapez ${CONFIRM_WORD} pour confirmer`}
            htmlFor="confirm-word"
          >
            <Input
              id="confirm-word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </Field>
          {password ? (
            <Field
              label="Votre mot de passe"
              htmlFor="confirm-password"
              hint="Par sécurité, confirmez votre identité."
            >
              <Input
                id="confirm-password"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground">
              Une fenêtre Google s’ouvrira pour confirmer votre identité.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!ready || pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const shop = useShop();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canSettings = useCan("shop.settings");
  const updateShop = useUpdateShop(shop.id);
  const leave = useLeaveShop();
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <PageHeader
        title="Paramètres"
        description={`${shop.name} · vous êtes ${ROLE_LABELS[shop.role].toLowerCase()}`}
      />
      <div className="grid max-w-3xl gap-6">
        {canSettings && (
          <Card>
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>Boutique</CardTitle>
              <CardDescription>
                Nom et description de la boutique, visibles par toute l’équipe.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShopForm
                key={shop.updatedAt}
                shop={shop}
                submitLabel="Enregistrer"
                error={updateShop.error}
                onSubmit={async (input) => {
                  await updateShop.mutateAsync(input);
                  toast.success("Boutique enregistrée.");
                }}
              />
            </CardContent>
          </Card>
        )}

        <NicknameCard key={shop.id} />

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>Compte</CardTitle>
            <CardDescription>Connecté avec {user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <AccountNameField />
            <div className="flex flex-wrap gap-2 border-t pt-5">
              <Button variant="outline" asChild>
                <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
                  <ExternalLink /> Politique de confidentialité
                </a>
              </Button>
              <Button variant="outline" onClick={() => signOut(queryClient)}>
                <LogOut /> Se déconnecter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-danger/30">
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle className="text-danger">Zone sensible</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div>
                <p className="text-sm font-semibold">Quitter {shop.name}</p>
                <p className="text-sm text-muted-foreground">
                  Vous n’aurez plus accès à cette boutique, sauf nouvelle
                  invitation.
                </p>
              </div>
              <Button variant="outline" onClick={() => setLeaving(true)}>
                <LogOut /> Quitter la boutique
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div>
                <p className="text-sm font-semibold">Supprimer mon compte</p>
                <p className="text-sm text-muted-foreground">
                  Suppression définitive de votre compte et de vos données.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setDeleting(true)}>
                <Trash2 /> Supprimer mon compte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title={`Quitter ${shop.name} ?`}
        description="Vous n’aurez plus accès à cette boutique, sauf nouvelle invitation."
        confirmLabel="Quitter la boutique"
        pending={leave.isPending}
        onConfirm={async () => {
          try {
            await leave.mutateAsync();
            toast.success(`Vous avez quitté ${shop.name}.`);
            router.replace("/");
          } catch (e) {
            setLeaving(false);
            toast.error(apiErrorMessage(e));
          }
        }}
      />
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </>
  );
}
