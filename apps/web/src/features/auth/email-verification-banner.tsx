"use client";

import { MailWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";

import { useAuth } from "./auth-provider";
import { authErrorMessage } from "./auth-errors";
import { refreshEmailVerified, resendVerificationEmail } from "./auth-service";

/** Email accounts not verified yet: resend the link, or check again once clicked. */
export function EmailVerificationBanner() {
  const { user, reload } = useAuth();
  const [pending, setPending] = useState(false);
  const isPassword = user?.providerData.some(
    (p) => p.providerId === "password",
  );
  if (!user || user.emailVerified || !isPassword) return null;

  const check = async () => {
    setPending(true);
    try {
      const verified = await refreshEmailVerified();
      reload();
      if (verified) toast.success("Email vérifié, merci !");
      else
        toast.info("Pas encore vérifié : cliquez sur le lien reçu par email.");
    } catch (e) {
      toast.error(authErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const resend = async () => {
    try {
      await resendVerificationEmail();
      toast.success(`Lien renvoyé à ${user.email}.`);
    } catch (e) {
      toast.error(authErrorMessage(e));
    }
  };

  return (
    <InlineAlert
      icon={MailWarning}
      action={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={resend}
            className="text-gold-ink hover:bg-gold/20"
          >
            Renvoyer l’email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={check}
            disabled={pending}
          >
            J’ai vérifié
          </Button>
        </div>
      }
    >
      Vérifiez votre email : un lien a été envoyé à{" "}
      <strong>{user.email}</strong>.
    </InlineAlert>
  );
}
