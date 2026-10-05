"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/app/field";
import { ErrorState } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJoinShop } from "@/features/shop/use-shops";
import { ApiError } from "@/lib/api-client";

import type { Shop } from "../shop/shop-api";

/** Join a shop: 6-character code, then the pseudo shown to the team. */
export function JoinForm({ onJoined }: { onJoined: (shop: Shop) => void }) {
  const join = useJoinShop();
  const [step, setStep] = useState<"code" | "nickname">("code");
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [codeError, setCodeError] = useState<string>();
  const cleanCode = code.replace(/\s/g, "").toUpperCase();

  const next = (event: React.FormEvent) => {
    event.preventDefault();
    if (cleanCode.length !== 6)
      return setCodeError("Le code fait 6 caractères.");
    setCodeError(undefined);
    join.reset();
    setStep("nickname");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const shop = await join.mutateAsync({
        code: cleanCode,
        nickname: nickname.trim() || null,
      });
      onJoined(shop);
    } catch (error) {
      // A wrong or used code: back to the code step, with the message.
      const code = error instanceof ApiError ? error.body.code : undefined;
      if (code === "INVITATION_UNKNOWN" || code === "INVITATION_EXPIRED")
        setStep("code");
    }
  };

  if (step === "code") {
    return (
      <form onSubmit={next} className="flex flex-col gap-4" noValidate>
        {join.isError && <ErrorState error={join.error} />}
        <Field
          label="Code d’invitation"
          htmlFor="join-code"
          hint="6 caractères, reçus du propriétaire ou du gérant de la boutique."
          error={codeError}
        >
          <Input
            id="join-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex. K7M2QX"
            maxLength={8}
            autoCapitalize="characters"
            className="font-mono tracking-[0.3em] uppercase"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit">Continuer</Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {join.isError && <ErrorState error={join.error} />}
      <Field
        label="Votre pseudo dans la boutique"
        htmlFor="join-nickname"
        hint="C’est ce que verra l’équipe (jamais votre email). Unique dans la boutique."
      >
        <Input
          id="join-nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Ex. Rado moto"
          maxLength={50}
          autoFocus
        />
      </Field>
      <div className="flex justify-between gap-2">
        <Button type="button" variant="ghost" onClick={() => setStep("code")}>
          Changer de code
        </Button>
        <Button type="submit" disabled={join.isPending}>
          {join.isPending && <Loader2 className="animate-spin" />}
          Rejoindre la boutique
        </Button>
      </div>
    </form>
  );
}
