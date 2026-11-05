"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  MARKETING_CONSENT_KEY,
  canOfferMetaConsent,
  getMarketingState,
  loadMarketingPublicConfigAfterConsent,
  recordMarketingEvent,
  refreshMarketingConsentFromStorage,
  retryMarketingOrderLinks,
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
  const lastPageTracked = useRef<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const state = getMarketingState();
      setConsent(state.consent);
      setEnabled(state.enabled);
    };
    refresh();
    const reconnect = () => {
      void retryPendingMarketingRevocation();
      void loadMarketingPublicConfigAfterConsent().then(retryMarketingOrderLinks);
    };
    const refreshAcrossTabs = (event: StorageEvent) => {
      if (event.key !== MARKETING_CONSENT_KEY && event.key !== null) return;
      refreshMarketingConsentFromStorage();
      refresh();
    };
    reconnect();
    window.addEventListener("delizza-marketing-consent", refresh);
    window.addEventListener("delizza-marketing-config", refresh);
    window.addEventListener("online", reconnect);
    window.addEventListener("storage", refreshAcrossTabs);
    return () => {
      window.removeEventListener("delizza-marketing-consent", refresh);
      window.removeEventListener("delizza-marketing-config", refresh);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("storage", refreshAcrossTabs);
    };
  }, []);

  useEffect(() => {
    if (!consent?.analytics || !enabled) return;
    const key = `${consent.updatedAt}:${pathname}`;
    if (lastPageTracked.current === key) return;
    lastPageTracked.current = key;
    recordMarketingEvent("page_view", { path: pathname || "/" });
  }, [consent, enabled, pathname]);

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
        onSave={(analytics, marketing, metaAdvertising) => {
          setMarketingConsent({ analytics, marketing, metaAdvertising });
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
  const metaAvailable = canOfferMetaConsent();
  return (
    <section role="dialog" aria-label="Choix de confidentialité" className="fixed inset-x-3 bottom-14 z-[9999] mx-auto max-w-2xl rounded-[20px] border border-[#4A4A4A] bg-[#171717] p-5 shadow-2xl">
      <h2 className="text-lg font-semibold text-[#F5F5F5]">Vos choix de confidentialité</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#C7C7C7]">Avec votre accord, nous mesurons la fréquentation et, séparément, l&apos;origine de certaines visites. Ces choix n&apos;empêchent jamais de consulter le site ni de commander.</p>
      {metaAvailable && <p className="mt-2 text-sm leading-relaxed text-[#C7C7C7]">Vous pouvez aussi autoriser Meta (Facebook et Instagram) à mesurer les visites et achats liés à nos publicités.</p>}
      <Link href="/privacy" className="mt-2 inline-block text-sm text-[#D4A053] underline">Lire la politique de confidentialité</Link>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => setMarketingConsent({ analytics: true, marketing: true, metaAdvertising: metaAvailable })} className="min-h-11 flex-1 rounded-xl bg-[#D4A053] px-4 font-semibold text-[#0D0D0D]">Tout accepter</button>
        <button type="button" onClick={() => setMarketingConsent({ analytics: false, marketing: false })} className="min-h-11 flex-1 rounded-xl border border-[#D4A053] px-4 font-semibold text-[#F5F5F5]">Tout refuser</button>
        <button type="button" onClick={onOpenPreferences} className="min-h-11 flex-1 rounded-xl border border-[#4A4A4A] px-4 text-[#F5F5F5]">Personnaliser</button>
      </div>
    </section>
  );
}

function ConsentPreferences({ open, consent, onClose, onSave, onWithdraw }: {
  open: boolean; consent: MarketingConsent | null; onClose: () => void; onSave: (analytics: boolean, marketing: boolean, metaAdvertising: boolean) => void; onWithdraw: () => Promise<void>;
}) {
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);
  const [metaAdvertising, setMetaAdvertising] = useState(consent?.metaAdvertising ?? false);
  if (!open) return null;
  return (
    <section role="dialog" aria-modal="true" aria-label="Préférences de confidentialité" className="fixed inset-0 z-[10000] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
      <div className="w-full max-w-xl rounded-[20px] bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold text-[#F5F5F5]">Préférences de confidentialité</h2><p className="mt-1 text-sm text-[#A0A0A0]">Vous pouvez modifier ou retirer vos choix à tout moment.</p></div><button type="button" aria-label="Fermer" onClick={onClose} className="text-2xl text-[#F5F5F5]">×</button></div>
        <Link href="/privacy" className="mt-3 inline-block text-sm text-[#D4A053] underline">Lire la politique de confidentialité</Link>
        <label className="mt-6 flex gap-3 rounded-xl border border-[#353535] p-4 text-[#E5E5E5]"><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} className="mt-1 h-4 w-4" /><span><strong>Mesure d&apos;audience</strong><br /><span className="text-sm text-[#A0A0A0]">Mesure les pages et étapes de navigation avec un identifiant pseudonyme.</span></span></label>
        <label className="mt-3 flex gap-3 rounded-xl border border-[#353535] p-4 text-[#E5E5E5]"><input type="checkbox" checked={marketing} disabled={!analytics} onChange={(event) => setMarketing(event.target.checked)} className="mt-1 h-4 w-4" /><span><strong>Mesure marketing</strong><br /><span className="text-sm text-[#A0A0A0]">Conserve les paramètres de campagne et le référent pour attribuer les commandes couvertes.</span></span></label>
        {canOfferMetaConsent() && <label className="mt-3 flex gap-3 rounded-xl border border-[#353535] p-4 text-[#E5E5E5]"><input type="checkbox" checked={analytics && metaAdvertising} disabled={!analytics} onChange={(event) => setMetaAdvertising(event.target.checked)} className="mt-1 h-4 w-4" /><span><strong>Mesure publicitaire Meta</strong><br /><span className="text-sm text-[#A0A0A0]">Partage avec Meta certaines étapes de navigation, ainsi que le montant et la devise des achats confirmés, pour mesurer les publicités Facebook et Instagram.</span></span></label>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row"><button type="button" onClick={() => onSave(analytics, analytics && marketing, analytics && metaAdvertising)} className="min-h-11 flex-1 rounded-xl bg-[#D4A053] px-4 font-semibold text-[#0D0D0D]">Enregistrer mes choix</button>{consent && <button type="button" onClick={() => void onWithdraw()} className="min-h-11 flex-1 rounded-xl border border-[#D4A053] px-4 text-[#F5F5F5]">Retirer mon consentement</button>}</div>
      </div>
    </section>
  );
}
