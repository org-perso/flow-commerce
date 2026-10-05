"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/app/field";
import { InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authErrorMessage } from "@/features/auth/auth-errors";
import { signIn } from "@/features/auth/auth-service";
import { GoogleSignInButton } from "@/features/auth/google-button";
import { signInSchema, type SignInValues } from "@/features/auth/schemas";

export default function SignInPage() {
  const [error, setError] = useState<string>();
  const { register, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit(async ({ email, password }) => {
    setError(undefined);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Retrouvez votre boutique et vos commandes.
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
          label={
            <span className="flex w-full items-center justify-between">
              Mot de passe
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs font-medium text-link hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </span>
          }
          htmlFor="password"
          error={formState.errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            aria-invalid={!!formState.errors.password}
          />
        </Field>
        <Button
          type="submit"
          disabled={formState.isSubmitting}
          className="w-full"
        >
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          Se connecter
        </Button>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleSignInButton onError={setError} />
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/inscription"
          className="font-semibold text-link hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
