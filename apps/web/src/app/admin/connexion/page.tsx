"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { BrandMark } from "@/components/app/brand";
import { Field } from "@/components/app/field";
import { InlineAlert } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminErrorMessage,
  post,
  type LoginNext,
} from "@/features/admin/admin-api";
import { adminKeys } from "@/features/admin/use-admin";

type Step =
  | { name: "login" }
  | { name: "setup"; qrCode: string; secret: string }
  | { name: "verify" }
  | { name: "recovery"; codes: string[] };

/**
 * Admin sign-in (af-v3-admin F-19): username + password, then the authenticator code.
 * First sign-in: scan the QR code, confirm with a first code, keep the recovery codes.
 */
export default function AdminSignInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>({ name: "login" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const enter = async (changePassword: boolean) => {
    await queryClient.invalidateQueries({ queryKey: adminKeys.all });
    router.replace(changePassword ? "/admin/compte" : "/admin");
  };

  /** Runs a step: shows the API's message on failure. */
  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(adminErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-navy p-4">
      <div className="pointer-events-none fixed -right-24 -bottom-24 size-80 rounded-full border-[40px] border-gold/15" />
      <div className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark />
          <span className="font-bold tracking-tight">Flow.Co</span>
          <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-bold text-on-gold">
            Admin
          </span>
        </div>

        {step.name === "login" && (
          <LoginForm
            pending={pending}
            onSubmit={(username, password) =>
              run(async () => {
                const res = await post<{
                  next: LoginNext;
                  mustChangePassword: boolean;
                }>("/auth/login", { username, password });
                setMustChangePassword(res.mustChangePassword);
                if (res.next === "done") return enter(res.mustChangePassword);
                if (res.next === "mfa") return setStep({ name: "verify" });
                const setup = await post<{ qrCode: string; secret: string }>(
                  "/auth/mfa/setup",
                );
                setStep({ name: "setup", ...setup });
              })
            }
          />
        )}

        {step.name === "setup" && (
          <SetupStep
            qrCode={step.qrCode}
            secret={step.secret}
            pending={pending}
            onSubmit={(code) =>
              run(async () => {
                const res = await post<{ recoveryCodes: string[] }>(
                  "/auth/mfa/setup/confirm",
                  { code },
                );
                setStep({ name: "recovery", codes: res.recoveryCodes });
              })
            }
          />
        )}

        {step.name === "verify" && (
          <VerifyStep
            pending={pending}
            onSubmit={(body) =>
              run(async () => {
                await post("/auth/mfa/verify", body);
                await enter(mustChangePassword);
              })
            }
          />
        )}

        {step.name === "recovery" && (
          <RecoveryCodes
            codes={step.codes}
            onDone={() => enter(mustChangePassword)}
          />
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        {step.name !== "login" && step.name !== "recovery" && (
          <button
            type="button"
            className="mt-6 text-sm text-muted-foreground hover:text-foreground hover:underline"
            onClick={() => {
              setError(null);
              setStep({ name: "login" });
            }}
          >
            Recommencer la connexion
          </button>
        )}
      </div>
    </div>
  );
}

function StepTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {children && (
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      )}
    </div>
  );
}

function LoginForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (username: string, password: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(username.trim(), password);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <StepTitle title="Espace admin">Réservé à l’équipe Flow.Co.</StepTitle>
      <Field label="Identifiant" htmlFor="username">
        <Input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Continuer
      </Button>
    </form>
  );
}

function CodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      id="code"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="123456"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className="tabular text-center text-lg tracking-[0.4em]"
      autoFocus
    />
  );
}

function SetupStep({
  qrCode,
  secret,
  pending,
  onSubmit,
}: {
  qrCode: string;
  secret: string;
  pending: boolean;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code);
      }}
      className="flex flex-col gap-4"
    >
      <StepTitle title="Activez la double authentification">
        Scannez ce QR code avec Google Authenticator, Microsoft Authenticator ou
        Authy, puis saisissez le code affiché.
      </StepTitle>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from the API */}
      <img
        src={qrCode}
        alt="QR code à scanner avec l’application d’authentification"
        className="mx-auto size-48 rounded-lg border bg-white p-2"
      />
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Impossible de scanner ?</summary>
        <p className="mt-2">Saisissez cette clé dans l’application :</p>
        <code className="mt-1 block rounded bg-muted p-2 font-mono break-all text-foreground">
          {secret}
        </code>
      </details>
      <Field label="Code à 6 chiffres" htmlFor="code">
        <CodeInput value={code} onChange={setCode} />
      </Field>
      <Button type="submit" disabled={pending || code.length !== 6}>
        {pending && <Loader2 className="animate-spin" />}
        <ShieldCheck /> Activer
      </Button>
    </form>
  );
}

function VerifyStep({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (body: { code: string } | { recoveryCode: string }) => void;
}) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(
          useRecovery ? { recoveryCode: value.trim() } : { code: value },
        );
      }}
      className="flex flex-col gap-4"
    >
      {useRecovery ? (
        <>
          <StepTitle title="Code de secours">
            Un des 8 codes reçus à l’activation. Chaque code ne sert qu’une
            fois.
          </StepTitle>
          <Field label="Code de secours" htmlFor="recovery">
            <Input
              id="recovery"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="XXXX-XXXX"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="font-mono uppercase"
              autoFocus
            />
          </Field>
        </>
      ) : (
        <>
          <StepTitle title="Code de vérification">
            Ouvrez votre application d’authentification et saisissez le code «
            Flow.Co Admin ».
          </StepTitle>
          <Field label="Code à 6 chiffres" htmlFor="code">
            <CodeInput value={value} onChange={setValue} />
          </Field>
        </>
      )}
      <Button
        type="submit"
        disabled={
          pending ||
          (useRecovery ? value.trim().length < 8 : value.length !== 6)
        }
      >
        {pending && <Loader2 className="animate-spin" />}
        Se connecter
      </Button>
      <button
        type="button"
        className="flex items-center gap-1.5 self-start text-sm text-link hover:underline"
        onClick={() => {
          setUseRecovery(!useRecovery);
          setValue("");
        }}
      >
        {useRecovery ? (
          <>
            <Smartphone className="size-4" /> Utiliser l’application
          </>
        ) : (
          <>
            <KeyRound className="size-4" /> Téléphone perdu ? Code de secours
          </>
        )}
      </button>
    </form>
  );
}

function RecoveryCodes({
  codes,
  onDone,
}: {
  codes: string[];
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <StepTitle title="Vos codes de secours">
        Si vous perdez votre téléphone, chacun de ces codes permet une
        connexion. Ils ne seront plus jamais affichés.
      </StepTitle>
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code} className="text-center">
            {code}
          </li>
        ))}
      </ul>
      <Button
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(codes.join("\n"));
          setCopied(true);
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copiés" : "Copier les codes"}
      </Button>
      <InlineAlert tone="warning">
        Gardez-les dans un gestionnaire de mots de passe, pas dans vos notes.
      </InlineAlert>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
          className="size-4 accent-[var(--navy)]"
        />
        J’ai mis ces codes en lieu sûr
      </label>
      <Button disabled={!saved} onClick={onDone}>
        Continuer
      </Button>
    </div>
  );
}
