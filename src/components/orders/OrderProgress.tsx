"use client";

import { useId } from "react";

export type OrderTrackingPhase =
  | "validated"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "pending";

export interface OrderProgressTracking {
  phase: OrderTrackingPhase;
  title: string;
  description: string;
  step: 0 | 1 | 2 | 3 | -1;
  terminal: boolean;
}

export type OrderProgressSyncState =
  | "syncing"
  | "live"
  | "offline"
  | "complete"
  | "error";

interface OrderProgressProps {
  tracking: OrderProgressTracking;
  syncState: OrderProgressSyncState;
  delayed?: boolean;
}

const STEPS = ["Validée", "En préparation", "Prête", "Récupérée"];

function syncLabel(syncState: OrderProgressSyncState): string {
  switch (syncState) {
    case "live":
      return "Suivi en direct";
    case "complete":
      return "Suivi terminé";
    case "syncing":
      return "Synchronisation…";
    case "offline":
      return "Hors connexion — mise à jour en attente";
    case "error":
      return "Suivi indisponible — réessayez plus tard";
  }
}

/** Pure order-status presentation; its parent owns all data subscriptions and actions. */
export default function OrderProgress({ tracking, syncState, delayed = false }: OrderProgressProps) {
  const descriptionId = useId();
  const isCancelled = tracking.phase === "cancelled";
  const isPending = tracking.phase === "pending";
  const currentStep = tracking.step;
  const symbol = tracking.phase === "preparing" ? "👨‍🍳"
    : tracking.phase === "ready" ? "🍕"
      : isCancelled ? "×" : isPending ? "…" : "✓";

  const syncTone = syncState === "live"
    ? "border-[#D4A053]/30 bg-[#D4A053]/10 text-[#F4D296]"
    : syncState === "complete"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
      : syncState === "offline" || syncState === "error"
        ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
        : "border-white/10 bg-white/[0.04] text-[#B9B9B9]";

  return (
    <section
      className={`rounded-[20px] border px-5 py-5 shadow-[0_14px_40px_rgba(0,0,0,0.22)] transition-colors duration-500 motion-reduce:transition-none ${
        isCancelled
          ? "border-red-400/25 bg-red-950/20"
          : "border-white/10 bg-[#171717]"
      }`}
      aria-describedby={descriptionId}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D4A053]">Suivi de commande</p>
          <h2 className="mt-1 text-xl font-bold text-[#F5F5F5]">{tracking.title}</h2>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10 text-xl text-gold-light" aria-hidden="true">{symbol}</span>
        </div>
        <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${syncTone}`}>
          {syncLabel(syncState)}
        </span>
      </div>

      <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-[#B9B9B9]">
        {tracking.description}
      </p>

      {(syncState === "offline" || syncState === "syncing") && (
        <p className="mt-3 text-xs leading-relaxed text-amber-100" role="status">
          Dernier état connu. Le suivi se synchronisera automatiquement dès que la connexion sera rétablie.
        </p>
      )}

      {!isCancelled && !isPending && (
        <ol className="mt-5 grid grid-cols-4 gap-1.5" aria-label="Avancement de la commande">
          {STEPS.map((label, index) => {
            const reached = currentStep >= index;
            const current = currentStep === index;
            return (
              <li key={label} className="min-w-0" aria-current={current ? "step" : undefined}>
                <div
                  className={`h-1.5 rounded-full transition-colors duration-500 motion-reduce:transition-none ${
                    reached ? "bg-[#D4A053]" : "bg-white/10"
                  }`}
                  aria-hidden="true"
                />
                <p className={`mt-2 text-center text-[10px] leading-tight ${
                  current ? "font-semibold text-[#F4D296]" : reached ? "text-[#D7D7D7]" : "text-[#999]"
                }`}>
                  {label}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {delayed && (
        <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-100">
          La mise à jour peut prendre quelques instants.
        </p>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {tracking.title}. {tracking.description}
      </p>
    </section>
  );
}
