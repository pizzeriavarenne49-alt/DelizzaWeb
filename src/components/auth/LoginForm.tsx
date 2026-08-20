"use client";

import { useState } from "react";
import type React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getClientErrorMessage } from "@/lib/client-error-message";
import { normalizeFrenchPhone } from "@/lib/phone";

interface LoginFormProps {
  onSuccess?: () => void;
}

type AuthMode = "login" | "register" | "forgot" | "reset";

const passwordResetSentMessage =
  "Si un compte correspond a cette adresse, un email de reinitialisation vient d'etre envoye.";

function getFirebaseErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const {
    signIn,
    signUp,
    sendPasswordReset,
    verifyResetCode,
    confirmPasswordResetCode,
  } = useAuth();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const registrationEnabled = process.env.NEXT_PUBLIC_COMING_SOON !== "true";
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get("mode") === "resetPassword" && oobCode ? "reset" : "login",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title =
    mode === "login"
      ? "Connexion"
      : mode === "register"
        ? "Créer un compte"
        : mode === "forgot"
          ? "Mot de passe oublié"
          : "Nouveau mot de passe";

  const subtitle =
    mode === "login"
      ? "Connectez-vous pour commander"
      : mode === "register"
        ? "Inscrivez-vous pour commander"
        : mode === "forgot"
          ? "Saisissez l'adresse email de votre compte"
          : "Choisissez un nouveau mot de passe";

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        onSuccess?.();
      } else if (mode === "register") {
        if (!registrationEnabled) {
          setError("La creation de compte n'est pas encore ouverte.");
          return;
        }
        const normalizedPhone = normalizeFrenchPhone(phone);
        if (!name.trim()) {
          setError("Indiquez votre nom.");
          return;
        }
        if (!normalizedPhone) {
          setError("Indiquez un numéro de téléphone français valide.");
          return;
        }
        await signUp({
          email,
          password,
          displayName: name,
          phone: normalizedPhone,
        });
        onSuccess?.();
      } else if (mode === "forgot") {
        await sendPasswordReset(email);
        setSuccess(passwordResetSentMessage);
      } else {
        if (!oobCode) {
          setError("Lien de réinitialisation invalide.");
          return;
        }
        await verifyResetCode(oobCode);
        await confirmPasswordResetCode(oobCode, newPassword);
        setPassword("");
        setNewPassword("");
        setSuccess("Votre mot de passe a été modifié. Vous pouvez vous reconnecter.");
        setMode("login");
      }
    } catch (err: unknown) {
      if (mode === "forgot" && getFirebaseErrorCode(err) === "auth/user-not-found") {
        setSuccess(passwordResetSentMessage);
        return;
      }
      console.error("[auth] Authentication flow failed:", {
        mode,
        code: getFirebaseErrorCode(err),
      });
      setError(getClientErrorMessage(err, "auth"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] bg-[#1A1A1A] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <h1 className="mb-2 text-center text-[22px] font-bold text-[#F5F5F5]">{title}</h1>
        <p className="mb-6 text-center text-[13px] text-[#A0A0A0]">{subtitle}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <>
              <Field label="Nom" htmlFor="name">
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClassName}
                  placeholder="Votre nom"
                />
              </Field>
              <Field label="Téléphone" htmlFor="phone">
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClassName}
                  placeholder="06 12 34 56 78"
                />
              </Field>
            </>
          )}

          {mode !== "reset" && (
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClassName}
                placeholder="votre@email.com"
              />
            </Field>
          )}

          {(mode === "login" || mode === "register") && (
            <Field label="Mot de passe" htmlFor="password">
              <input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
                placeholder="••••••••"
              />
            </Field>
          )}

          {mode === "reset" && (
            <Field label="Nouveau mot de passe" htmlFor="new-password">
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClassName}
                placeholder="••••••••"
              />
            </Field>
          )}

          {mode === "register" && (
            <p className="text-[12px] leading-relaxed text-[#A0A0A0]">
              En créant un compte, vous pouvez consulter la{" "}
              <Link href="/privacy" className="text-[#D4A053] underline">politique de confidentialité</Link>,
              les{" "}
              <Link href="/mentions-legales" className="text-[#D4A053] underline">mentions légales</Link>
              {" "}et les{" "}
              <Link href="/cgu" className="text-[#D4A053] underline">conditions applicables</Link>.
            </p>
          )}

          {error && (
            <p className="rounded-[10px] bg-red-900/30 px-4 py-2 text-[13px] text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-[10px] bg-[#2ECC71]/10 px-4 py-2 text-[13px] text-[#8FE6B1]">
              {success}
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="mt-2 rounded-[12px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] transition-opacity disabled:opacity-60"
          >
            {loading
              ? "Chargement..."
              : mode === "login"
                ? "Se connecter"
                : mode === "register"
                  ? "Créer mon compte"
                  : mode === "forgot"
                    ? "Envoyer le lien"
                    : "Modifier le mot de passe"}
          </motion.button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-[13px] text-[#D4A053] hover:underline"
            >
              Mot de passe oublié ?
            </button>
          )}
          {(mode !== "login" || registrationEnabled) && (
          <button
            type="button"
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="text-[13px] text-[#D4A053] hover:underline"
          >
            {mode === "login"
              ? "Pas encore de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"}
          </button>
          )}
        </div>
      </motion.div>
    </div>
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
