"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/app/field";
import { InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authErrorMessage } from "@/features/auth/auth-errors";
import { signUp } from "@/features/auth/auth-service";
import { GoogleSignInButton } from "@/features/auth/google-button";
import { signUpSchema, type SignUpValues } from "@/features/auth/schemas";
import { PRIVACY_POLICY_URL } from "@/features/auth/terms";

function PolicyLink() {
  return (
    <a
      href={PRIVACY_POLICY_URL}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-link hover:underline"
    >
      politique de confidentialité
    </a>
  );
}

export default function SignUpPage() {
  const [error, setError] = useState<string>();
  const [accepted, setAccepted] = useState(false);
  const [consentError, setConsentError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setError(undefined);
    if (!accepted) {
      setConsentError(
        "Acceptez la politique de confidentialité pour créer votre compte.",
      );
      return;
    }
    try {
      await signUp(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Créer un compte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Un email de confirmation vous sera envoyé.
        </p>
      </div>
      {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field
          label="Email"
          htmlFor="email"
          error={formState.errors.email?.message}
        >
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            {...register("email")}
            aria-invalid={!!formState.errors.email}
          />
        </Field>
        <Field
          label="Mot de passe"
          htmlFor="password"
          hint="Au moins 8 caractères."
          error={formState.errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
            aria-invalid={!!formState.errors.password}
          />
        </Field>
        <Field
          label="Confirmer le mot de passe"
          htmlFor="confirmPassword"
          error={formState.errors.confirmPassword?.message}
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            aria-invalid={!!formState.errors.confirmPassword}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => {
                setAccepted(v === true);
                setConsentError(undefined);
              }}
              aria-invalid={!!consentError}
              className="mt-0.5"
            />
            <span>
              J’ai lu et j’accepte la <PolicyLink />.
            </span>
          </label>
          {consentError && (
            <p className="text-xs text-danger">{consentError}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={formState.isSubmitting}
          className="w-full"
        >
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          Créer mon compte
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-2">
        <GoogleSignInButton onError={setError} />
        <p className="text-center text-xs text-muted-foreground">
          En continuant avec Google, vous acceptez la <PolicyLink />.
        </p>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link
          href="/connexion"
          className="font-semibold text-link hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
