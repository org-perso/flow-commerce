"use client";

import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, MonitorSmartphone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Field } from "@/components/app/field";
import { PageHeader } from "@/components/app/page-header";
import { InlineAlert } from "@/components/app/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminErrorMessage, adminFetch, put } from "@/features/admin/admin-api";
import { SectionCard } from "@/features/admin/admin-ui";
import {
  adminKeys,
  useAdminAction,
  useAdminMe,
  useAdminSessions,
} from "@/features/admin/use-admin";
import { formatDateTime } from "@/lib/format";

/** The signed-in admin: password (forced after a temporary one), MFA status, sessions. */
export default function AdminAccountPage() {
  const me = useAdminMe().data;
  const sessions = useAdminSessions();
  const closeSession = useAdminAction(
    (id: string) => adminFetch(`/auth/sessions/${id}`, { method: "DELETE" }),
    "Session fermée",
  );

  return (
    <>
      <PageHeader
        title="Mon compte"
        description={me ? `${me.name} · @${me.username}` : undefined}
      />
      {me?.mustChangePassword && (
        <InlineAlert icon={KeyRound}>
          Votre mot de passe est provisoire : choisissez le vôtre pour accéder à
          l’espace admin.
        </InlineAlert>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Mot de passe">
          <PasswordForm />
        </SectionCard>

        <SectionCard title="Double authentification (MFA)">
          <div className="flex flex-col gap-2 px-5 py-4 text-sm">
            <p>
              {me?.mfaEnabled ? (
                <Badge variant="success">Activée</Badge>
              ) : (
                <Badge variant="outline">Non configurée</Badge>
              )}{" "}
              {me && !me.mfaRequired && (
                <Badge variant="warning">Facultative pour vous</Badge>
              )}
            </p>
            <p className="text-muted-foreground">
              Téléphone perdu : connectez-vous avec un code de secours, puis
              demandez à un autre admin de réinitialiser votre MFA.
            </p>
          </div>
        </SectionCard>
      </div>

      {!me?.mustChangePassword && (
        <SectionCard title="Sessions ouvertes">
          <ul className="divide-y">
            {sessions.data?.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-5 py-3 text-sm"
              >
                <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    {s.userAgent ?? "Appareil inconnu"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.ip ?? "IP inconnue"} · ouverte le{" "}
                    {formatDateTime(s.createdAt)} · active le{" "}
                    {formatDateTime(s.lastSeenAt)}
                  </p>
                </div>
                {s.current ? (
                  <Badge variant="secondary">Cette session</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={closeSession.isPending}
                    onClick={() => closeSession.mutate(s.id)}
                  >
                    Fermer
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </>
  );
}

function PasswordForm() {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm !== "" && next !== confirm;
  const valid = current && next.length >= 12 && next === confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await put("/auth/password", {
        currentPassword: current,
        newPassword: next,
      });
      toast.success("Mot de passe changé. Vos autres sessions sont fermées.");
      setCurrent("");
      setNext("");
      setConfirm("");
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    } catch (err) {
      setError(adminErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 px-5 py-4">
      <Field label="Mot de passe actuel" htmlFor="current">
        <Input
          id="current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </Field>
      <Field
        label="Nouveau mot de passe"
        htmlFor="new"
        hint="12 caractères minimum."
      >
        <Input
          id="new"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </Field>
      <Field
        label="Confirmez le nouveau mot de passe"
        htmlFor="confirm"
        error={mismatch ? "Les deux mots de passe sont différents." : undefined}
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="self-start" disabled={!valid || pending}>
        {pending && <Loader2 className="animate-spin" />}
        Changer le mot de passe
      </Button>
    </form>
  );
}
