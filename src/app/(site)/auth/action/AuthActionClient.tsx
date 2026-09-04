"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

type VerificationState = "checking" | "valid" | "invalid" | "unsupported" | "done";

function readFirebaseCode(error: unknown): string {
  return typeof error === "object" && error !== null && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "";
}

function getResetActionErrorMessage(error: unknown): string {
  const code = readFirebaseCode(error);
  if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
    return "Ce lien de réinitialisation n'est plus valide.";
  }
  if (code === "auth/user-disabled") {
    return "Ce compte ne peut pas être utilisé pour le moment.";
  }
  if (code === "auth/user-not-found") {
    return "Ce lien de réinitialisation n'est plus valide.";
  }
  if (code === "auth/weak-password") {
    return "Le mot de passe est trop faible. Utilisez au moins 6 caractères.";
  }
  if (code === "auth/network-request-failed") {
    return "Connexion impossible. Vérifiez votre connexion internet.";
  }
  return "Une erreur est survenue. Réessayez dans quelques instants.";
}

function AuthActionView() {
  const searchParams = useSearchParams();
  const { verifyResetCode, confirmPasswordResetCode } = useAuth();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");
  const [state, setState] = useState<VerificationState>("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isResetPassword = mode === "resetPassword";

  useEffect(() => {
    let cancelled = false;

    async function verifyCode() {
      setError(null);
      if (!isResetPassword) {
        setState(mode ? "unsupported" : "invalid");
        return;
      }
      if (!oobCode) {
        setState("invalid");
        setError("Ce lien de réinitialisation n'est plus valide.");
        return;
      }

      setState("checking");
      try {
        const verifiedEmail = await verifyResetCode(oobCode);
        if (cancelled) return;
        setEmail(verifiedEmail);
        setState("valid");
      } catch (err) {
        if (cancelled) return;
        setState("invalid");
        setError(getResetActionErrorMessage(err));
      }
    }

    verifyCode();
    return () => {
      cancelled = true;
    };
  }, [isResetPassword, mode, oobCode, verifyResetCode]);

  const title = useMemo(() => {
    if (state === "checking") return "Vérification du lien";
    if (state === "done") return "Mot de passe modifié";
    if (state === "unsupported") return "Action non disponible";
    return state === "valid" ? "Nouveau mot de passe" : "Lien invalide";
  }, [state]);

  const subtitle = useMemo(() => {
    if (state === "checking") return "Nous vérifions votre demande de réinitialisation.";
    if (state === "done") return "Votre mot de passe a bien été modifié.";
    if (state === "unsupported") return "Cette action Firebase n'est pas encore prise en charge sur le site.";
    if (state === "valid") return email ? `Compte ${email}` : "Choisissez un nouveau mot de passe.";
    return error ?? "Ce lien de réinitialisation n'est plus valide.";
  }, [email, error, state]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !oobCode) return;

    setError(null);
    if (!password || !confirmPassword) {
      setError("Renseignez le nouveau mot de passe et sa confirmation.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordResetCode(oobCode, password);
      setPassword("");
      setConfirmPassword("");
      setState("done");
    } catch (err) {
      setError(getResetActionErrorMessage(err));
      if (
        readFirebaseCode(err) === "auth/expired-action-code" ||
        readFirebaseCode(err) === "auth/invalid-action-code"
      ) {
        setState("invalid");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[360px] rounded-[24px] bg-[#1A1A1A] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <h1 className="mb-2 text-center text-[22px] font-bold text-[#F5F5F5]">{title}</h1>
        <p className="mb-6 text-center text-[13px] leading-relaxed text-[#A0A0A0]">{subtitle}</p>

        {state === "checking" && (
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4A053] border-t-transparent" aria-label="Chargement" />
          </div>
        )}

        {state === "valid" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Nouveau mot de passe" htmlFor="new-password">
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirmation du mot de passe" htmlFor="confirm-password">
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClassName}
                placeholder="••••••••"
              />
            </Field>

            {error && (
              <p className="rounded-[10px] bg-red-900/30 px-4 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-[12px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] transition-opacity disabled:opacity-60"
            >
              {submitting ? "Modification..." : "Modifier le mot de passe"}
            </motion.button>
          </form>
        )}

        {state === "invalid" && (
          <div className="flex flex-col gap-4">
            <p className="rounded-[10px] bg-red-900/30 px-4 py-2 text-[13px] leading-relaxed text-red-400">
              {error ?? subtitle}
            </p>
            <Link
              href="/auth?mode=forgot"
              className="rounded-[12px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-center text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)]"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}

        {state === "unsupported" && (
          <div className="flex flex-col gap-4">
            <p className="rounded-[10px] bg-red-900/30 px-4 py-2 text-[13px] leading-relaxed text-red-400">
              {subtitle}
            </p>
            <Link
              href="/auth"
              className="rounded-[12px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-center text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)]"
            >
              Se connecter
            </Link>
          </div>
        )}

        {state === "done" && (
          <div className="flex flex-col gap-4">
            <p className="rounded-[10px] bg-[#2ECC71]/10 px-4 py-2 text-[13px] leading-relaxed text-[#8FE6B1]">
              Votre mot de passe a bien été modifié.
            </p>
            <Link
              href="/auth"
              className="rounded-[12px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-center text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)]"
            >
              Se connecter
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthActionClient() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-sm">
          <div className="min-h-[360px] rounded-[24px] bg-[#1A1A1A] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" />
        </div>
      }
    >
      <AuthActionView />
    </Suspense>
  );
}

const inputClassName =
  "rounded-[12px] border border-white/10 bg-[#252525] px-4 py-3 text-[15px] text-[#F5F5F5] outline-none transition-colors placeholder:text-[#6B6B6B] focus:border-[#D4A053]";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-[#A0A0A0]">
        {label}
      </label>
      {children}
    </div>
  );
}
