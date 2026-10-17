"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  captureInitialAttributionIfAllowed,
  getMarketingState,
  loadMarketingPublicConfigAfterConsent,
  recordMarketingEvent,
  retryPendingMarketingRevocation,
  revokeMarketingConsent,
  setMarketingConsent,
} from "@/marketing/marketing-client";
import type { MarketingConsent, MarketingEventType } from "@/marketing/types";

type MarketingContextValue = {
  consent: MarketingConsent | null;
  enabled: boolean;
  openPreferences: () => void;
  track: (type: MarketingEventType, data?: { productId?: string; quantity?: number; errorCode?: string }) => void;
};

const MarketingContext = createContext<MarketingContextValue>({
  consent: null,
  enabled: false,
  openPreferences: () => undefined,
  track: () => undefined,
});

export function MarketingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<MarketingConsent | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const state = getMarketingState();
      setConsent(state.consent);
      setEnabled(state.enabled);
    };
    refresh();
    void retryPendingMarketingRevocation();
    if (getMarketingState().consent?.analytics) void loadMarketingPublicConfigAfterConsent();
    window.addEventListener("delizza-marketing-consent", refresh);
    window.addEventListener("delizza-marketing-config", refresh);
    window.addEventListener("online", retryPendingMarketingRevocation);
    return () => {
      window.removeEventListener("delizza-marketing-consent", refresh);
      window.removeEventListener("delizza-marketing-config", refresh);
      window.removeEventListener("online", retryPendingMarketingRevocation);
    };
  }, []);

  useEffect(() => {
    if (!consent?.analytics) return;
    const trackPage = () => {
      captureInitialAttributionIfAllowed();
      recordMarketingEvent("page_view", { path: pathname || "/" });
    };
    trackPage();
    window.addEventListener("delizza-marketing-config", trackPage);
    return () => window.removeEventListener("delizza-marketing-config", trackPage);
  }, [consent?.analytics, pathname]);

  const track = useCallback((type: MarketingEventType, data: { productId?: string; quantity?: number; errorCode?: string } = {}) => {
    recordMarketingEvent(type, { path: typeof window === "undefined" ? undefined : window.location.pathname, ...data });
  }, []);

  return (
    <MarketingContext.Provider value={{ consent, enabled, openPreferences: () => setPreferencesOpen(true), track }}>
      {children}
      {!consent && <ConsentBanner onOpenPreferences={() => setPreferencesOpen(true)} />}
      <ConsentPreferences
        open={preferencesOpen}
        key={`${consent?.updatedAt ?? "none"}-${preferencesOpen}`}
        consent={consent}
        onClose={() => setPreferencesOpen(false)}
        onSave={(analytics, marketing) => {
          setMarketingConsent({ analytics, marketing });
          setPreferencesOpen(false);
        }}
        onWithdraw={async () => {
          await revokeMarketingConsent();
          setPreferencesOpen(false);
        }}
      />
    </MarketingContext.Provider>
  );
}

export function useMarketing(): MarketingContextValue { return useContext(MarketingContext); }

function ConsentBanner({ onOpenPreferences }: { onOpenPreferences: () => void }) {
  return (
    <section role="dialog" aria-label="Choix de confidentialité" className="fixed inset-x-3 bottom-14 z-[9999] mx-auto max-w-2xl rounded-[20px] border border-[#4A4A4A] bg-[#171717] p-5 shadow-2xl">
      <h2 className="text-lg font-semibold text-[#F5F5F5]">Vos choix de confidentialité</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#C7C7C7]">Avec votre accord, nous mesurons la fréquentation et, séparément, l&apos;origine de certaines visites. Ces choix n&apos;empêchent jamais de consulter le site ni de commander.</p>
      <Link href="/privacy" className="mt-2 inline-block text-sm text-[#D4A053] underline">Lire la politique de confidentialité</Link>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => setMarketingConsent({ analytics: true, marketing: true })} className="min-h-11 flex-1 rounded-xl bg-[#D4A053] px-4 font-semibold text-[#0D0D0D]">Tout accepter</button>
        <button type="button" onClick={() => setMarketingConsent({ analytics: false, marketing: false })} className="min-h-11 flex-1 rounded-xl border border-[#D4A053] px-4 font-semibold text-[#F5F5F5]">Tout refuser</button>
        <button type="button" onClick={onOpenPreferences} className="min-h-11 flex-1 rounded-xl border border-[#4A4A4A] px-4 text-[#F5F5F5]">Personnaliser</button>
      </div>
    </section>
  );
}

function ConsentPreferences({ open, consent, onClose, onSave, onWithdraw }: {
  open: boolean; consent: MarketingConsent | null; onClose: () => void; onSave: (analytics: boolean, marketing: boolean) => void; onWithdraw: () => Promise<void>;
}) {
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);
  if (!open) return null;
  return (
    <section role="dialog" aria-modal="true" aria-label="Préférences de confidentialité" className="fixed inset-0 z-[10000] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
      <div className="w-full max-w-xl rounded-[20px] bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-[#F5F5F5]">Préférences de confidentialité</h2><p className="mt-1 text-sm text-[#A0A0A0]">Vous pouvez modifier ou retirer vos choix à tout moment.</p></div><button type="button" aria-label="Fermer" onClick={onClose} className="text-2xl text-[#F5F5F5]">×</button></div>
        <Link href="/privacy" className="mt-3 inline-block text-sm text-[#D4A053] underline">Lire la politique de confidentialité</Link>
        <label className="mt-6 flex gap-3 rounded-xl border border-[#353535] p-4 text-[#E5E5E5]"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1 h-4 w-4" /><span><strong>Mesure d&apos;audience</strong><br /><span className="text-sm text-[#A0A0A0]">Mesure les pages et étapes de navigation avec un identifiant pseudonyme.</span></span></label>
        <label className="mt-3 flex gap-3 rounded-xl border border-[#353535] p-4 text-[#E5E5E5]"><input type="checkbox" checked={marketing} disabled={!analytics} onChange={(event) => setMarketing(event.target.checked)} className="mt-1 h-4 w-4" /><span><strong>Mesure marketing</strong><br /><span className="text-sm text-[#A0A0A0]">Conserve les paramètres de campagne et le référent pour attribuer les commandes couvertes.</span></span></label>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => onSave(analytics, analytics && marketing)} className="min-h-11 flex-1 rounded-xl bg-[#D4A053] px-4 font-semibold text-[#0D0D0D]">Enregistrer mes choix</button>{consent && <button type="button" onClick={() => void onWithdraw()} className="min-h-11 flex-1 rounded-xl border border-[#D4A053] px-4 text-[#F5F5F5]">Retirer mon consentement</button>}</div>
      </div>
    </section>
  );
}
