"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field } from "@/components/app/field";
import { InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authErrorMessage } from "@/features/auth/auth-errors";
import { sendPasswordReset } from "@/features/auth/auth-service";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/features/auth/schemas";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const submit = handleSubmit(async ({ email }) => {
    setError(undefined);
    try {
      await sendPasswordReset(email);
      setSentTo(email);
    } catch (e) {
      setError(authErrorMessage(e));
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/connexion"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Retour à la connexion
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recevez un lien pour choisir un nouveau mot de passe.
        </p>
      </div>
      {sentTo ? (
        <InlineAlert tone="success" icon={MailCheck}>
          Si un compte existe pour {sentTo}, un email vient de lui être envoyé.
          Pensez à regarder dans les spams.
        </InlineAlert>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error && <InlineAlert tone="danger">{error}</InlineAlert>}
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
            />
          </Field>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting && <Loader2 className="animate-spin" />}
            Envoyer le lien
          </Button>
        </form>
      )}
    </div>
  );
}
