"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      onSuccess?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[24px] bg-[#1A1A1A] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <h1 className="mb-2 text-center text-[22px] font-bold text-[#F5F5F5]">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mb-6 text-center text-[13px] text-[#A0A0A0]">
          {mode === "login"
            ? "Connectez-vous pour commander"
            : "Inscrivez-vous pour commander"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[13px] font-medium text-[#A0A0A0]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-[12px] border border-white/10 bg-[#252525] px-4 py-3 text-[15px] text-[#F5F5F5] placeholder-[#6B6B6B] outline-none focus:border-[#D4A053] transition-colors"
              placeholder="votre@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-[13px] font-medium text-[#A0A0A0]"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[12px] border border-white/10 bg-[#252525] px-4 py-3 text-[15px] text-[#F5F5F5] placeholder-[#6B6B6B] outline-none focus:border-[#D4A053] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-[10px] bg-red-900/30 px-4 py-2 text-[13px] text-red-400">
              {error}
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="mt-2 rounded-[12px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] py-3.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] disabled:opacity-60 transition-opacity"
          >
            {loading
              ? "Chargement…"
              : mode === "login"
                ? "Se connecter"
                : "Créer mon compte"}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="text-[13px] text-[#D4A053] hover:underline"
          >
            {mode === "login"
              ? "Pas encore de compte ? S'inscrire"
              : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
