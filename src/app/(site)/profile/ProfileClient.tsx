"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { track } from "@/analytics";
import { CLIENT_WL_APP_ID } from "@/config/firebase-client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import {
  getCustomerOrderPresentation,
  isVisibleInCustomerHistory,
} from "@/lib/customer-order-presentation";
import { formatFrenchPhone, normalizeFrenchPhone } from "@/lib/phone";
import {
  getCustomerProfile,
  listRecentCustomerOrders,
  updateCustomerProfile,
  type CustomerOrderSummary,
  type CustomerProfile,
} from "@/services/customer-profile-service";
import { syncDelizzaCustomerProfile } from "@/services/customer-session";
import {
  claimLoyaltyTicketCode,
  DEFAULT_REWARD_THRESHOLD,
  getLoyaltyClaimErrorMessage,
  getLoyaltyState,
  type LoyaltyState,
} from "@/services/loyalty-service";
import { formatPrice } from "@/types";

type SectionStatus = "idle" | "loading" | "success" | "error";

const emptyProfile: CustomerProfile = { displayName: "", phone: "" };

export default function ProfileClient() {
  const { user, loading, signOut } = useAuth();
  const ordersRef = useRef<HTMLElement | null>(null);
  const loadGenerationRef = useRef(0);

  const [loyalty, setLoyalty] = useState<LoyaltyState | null>(null);
  const [loyaltyStatus, setLoyaltyStatus] = useState<SectionStatus>("idle");
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile);
  const [initialProfile, setInitialProfile] = useState<CustomerProfile>(emptyProfile);
  const [profileStatus, setProfileStatus] = useState<SectionStatus>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [ordersStatus, setOrdersStatus] = useState<SectionStatus>("idle");
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [loyaltyCode, setLoyaltyCode] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    track({ name: "view_profile" });
  }, []);

  const loadLoyalty = useCallback(async (generation = loadGenerationRef.current) => {
    const currentUser = user;
    if (!currentUser) return;
    setLoyaltyStatus("loading");
    setLoyaltyError(null);
    try {
      const nextLoyalty = await getLoyaltyState(CLIENT_WL_APP_ID, currentUser.uid);
      if (generation !== loadGenerationRef.current) return;
      setLoyalty(nextLoyalty);
      setLoyaltyStatus("success");
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      console.error("[profile] Unable to load loyalty:", {
        code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
      });
      setLoyaltyStatus("error");
      setLoyaltyError("Votre fidélité est momentanément indisponible.");
    }
  }, [user]);

  const loadProfile = useCallback(async (generation = loadGenerationRef.current) => {
    const currentUser = user;
    if (!currentUser) return;
    setProfileStatus("loading");
    setProfileError(null);
    setFormError(null);
    try {
      const loadedProfile = await getCustomerProfile(currentUser.uid);
      if (generation !== loadGenerationRef.current) return;
      const nextProfile = {
        displayName: loadedProfile.displayName || currentUser.displayName || "",
        phone: loadedProfile.phone,
      };
      setProfile(nextProfile);
      setInitialProfile(nextProfile);
      setProfileStatus("success");
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      console.error("[profile] Unable to load customer profile:", {
        code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
      });
      setProfileStatus("error");
      setProfileError("Vos informations n'ont pas pu être chargées.");
    }
  }, [user]);

  const loadOrders = useCallback(async (generation = loadGenerationRef.current) => {
    const currentUser = user;
    if (!currentUser) return;
    setOrdersStatus("loading");
    setOrdersError(null);
    try {
      const nextOrders = await listRecentCustomerOrders(currentUser.uid);
      if (generation !== loadGenerationRef.current) return;
      setOrders(nextOrders);
      setOrdersStatus("success");
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      console.error("[profile] Unable to load customer orders:", {
        code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
      });
      setOrdersStatus("error");
      setOrdersError("Vos commandes récentes ne sont pas disponibles pour le moment.");
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      loadGenerationRef.current += 1;
      setLoyalty(null);
      setOrders([]);
      setProfile(emptyProfile);
      setInitialProfile(emptyProfile);
      setLoyaltyStatus("idle");
      setProfileStatus("idle");
      setOrdersStatus("idle");
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    void loadLoyalty(generation);
    void loadProfile(generation);
    void loadOrders(generation);
  }, [loadLoyalty, loadOrders, loadProfile, user]);

  useEffect(() => {
    if (!formMessage) return;
    const timeout = window.setTimeout(() => setFormMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [formMessage]);

  const visibleOrders = useMemo(
    () => orders.filter((order) => isVisibleInCustomerHistory(order)),
    [orders],
  );

  const isDirty = useMemo(() => {
    const currentPhone = normalizeFrenchPhone(profile.phone) ?? profile.phone.trim();
    const initialPhone = normalizeFrenchPhone(initialProfile.phone) ?? initialProfile.phone.trim();
    return (
      profile.displayName.trim() !== initialProfile.displayName.trim() ||
      currentPhone !== initialPhone
    );
  }, [initialProfile, profile]);

  const displayFirstName = useMemo(() => {
    const source = profile.displayName.trim() || user?.displayName?.trim() || "";
    return source.split(/\s+/)[0] ?? "";
  }, [profile.displayName, user?.displayName]);

  const saveProfile = async () => {
    if (!user || saving || !isDirty) return;
    setSaving(true);
    setFormError(null);
    setFormMessage(null);

    try {
      const displayName = profile.displayName.trim();
      const normalizedPhone = normalizeFrenchPhone(profile.phone);

      if (!displayName) {
        setFormError("Le nom est obligatoire.");
        return;
      }
      if (!normalizedPhone) {
        setFormError("Indiquez un numéro de téléphone français valide.");
        return;
      }

      const savedProfile = { displayName, phone: normalizedPhone };
      await syncDelizzaCustomerProfile(savedProfile);
      await updateCustomerProfile(user.uid, savedProfile);
      setProfile(savedProfile);
      setInitialProfile(savedProfile);
      setFormMessage("Vos informations ont été enregistrées ✓");
    } catch (err) {
      console.error("[profile] Unable to update profile:", {
        code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
      });
      setFormError("L'enregistrement a échoué. Réessayez dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  const claimCode = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!user || claimLoading) return;

    const trimmedCode = loyaltyCode.trim();
    if (!trimmedCode) {
      setClaimError("Entrez votre code fidélité.");
      setClaimMessage(null);
      return;
    }

    setClaimLoading(true);
    setClaimError(null);
    setClaimMessage(null);
    try {
      const result = await claimLoyaltyTicketCode(trimmedCode);
      setLoyaltyCode("");
      setClaimMessage(
        result.rewardIssued
          ? "Code validé. Votre passage est ajouté et une récompense est disponible."
          : "Code fidélité validé.",
      );
      try {
        setLoyalty(await getLoyaltyState(CLIENT_WL_APP_ID, user.uid));
        setLoyaltyStatus("success");
        setLoyaltyError(null);
      } catch (refreshError) {
        console.error("[loyalty] Unable to refresh loyalty after claim:", {
          code: typeof refreshError === "object" && refreshError !== null
            ? (refreshError as { code?: unknown }).code
            : undefined,
        });
        setLoyaltyStatus("error");
        setLoyaltyError("Code validé, mais la fidélité n'a pas pu être actualisée.");
      }
    } catch (err) {
      console.error("[loyalty] Unable to claim ticket code:", {
        code: typeof err === "object" && err !== null ? (err as { code?: unknown }).code : undefined,
      });
      setClaimError(getLoyaltyClaimErrorMessage(err));
    } finally {
      setClaimLoading(false);
    }
  };

  const scrollToOrders = () => {
    ordersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center gap-5 px-4">
        <ProfileIntroSkeleton />
        <LoyaltyCardSkeleton />
      </div>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-[80vh] flex-col items-center justify-center gap-7 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-[24px] font-bold text-foreground">Votre espace Deli&apos;Zza</h1>
          <p className="max-w-xs text-[15px] leading-relaxed text-text-secondary">
            Connectez-vous pour retrouver votre fidélité, vos commandes et vos informations.
          </p>
        </div>
        <Link
          href="/auth"
          className="rounded-[16px] bg-gradient-to-br from-gold to-gold-light px-8 py-3.5 text-[15px] font-semibold text-background shadow-[0_12px_30px_rgba(212,160,83,0.18)] transition-transform active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] pt-5 md:max-w-xl md:pb-10 md:pt-8">
      <header className="px-1">
        <p className="break-words text-[26px] font-semibold leading-tight text-foreground">
          Bonjour{displayFirstName ? ` ${displayFirstName}` : ""}
        </p>
        <p className="mt-1 text-[14px] leading-relaxed text-text-secondary">
          Heureux de vous revoir chez Deli&apos;Zza.
        </p>
      </header>

      <LoyaltyCard
        status={loyaltyStatus}
        loyalty={loyalty}
        error={loyaltyError}
        codePanelOpen={codePanelOpen}
        loyaltyCode={loyaltyCode}
        claimLoading={claimLoading}
        claimMessage={claimMessage}
        claimError={claimError}
        onRetry={loadLoyalty}
        onToggleCode={() => setCodePanelOpen((open) => !open)}
        onCodeChange={setLoyaltyCode}
        onClaimCode={claimCode}
      />

      <QuickActions
        onOrdersClick={scrollToOrders}
        onCodeClick={() => setCodePanelOpen(true)}
      />

      <OrdersSection
        refProp={ordersRef}
        status={ordersStatus}
        orders={visibleOrders}
        error={ordersError}
        onRetry={loadOrders}
      />

      <ProfileInformationCard
        userEmail={user.email ?? ""}
        profile={profile}
        status={profileStatus}
        loadError={profileError}
        formError={formError}
        formMessage={formMessage}
        saving={saving}
        isDirty={isDirty}
        onRetry={loadProfile}
        onProfileChange={setProfile}
        onSave={saveProfile}
      />

      <AccountSecurityCard onSignOut={signOut} />
    </main>
  );
}

function LoyaltyCard({
  status,
  loyalty,
  error,
  codePanelOpen,
  loyaltyCode,
  claimLoading,
  claimMessage,
  claimError,
  onRetry,
  onToggleCode,
  onCodeChange,
  onClaimCode,
}: {
  status: SectionStatus;
  loyalty: LoyaltyState | null;
  error: string | null;
  codePanelOpen: boolean;
  loyaltyCode: string;
  claimLoading: boolean;
  claimMessage: string | null;
  claimError: string | null;
  onRetry: () => void;
  onToggleCode: () => void;
  onCodeChange: (value: string) => void;
  onClaimCode: (event?: React.FormEvent<HTMLFormElement>) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  if (status === "loading" || status === "idle") return <LoyaltyCardSkeleton />;

  if (status === "error") {
    return (
      <section className={cardClassName} aria-live="polite">
        <SectionTitle title="Votre fidélité" />
        <InlineError message={error ?? "Votre fidélité est indisponible."} onRetry={onRetry} />
        <CollapsedCodeButton open={codePanelOpen} onToggle={onToggleCode} />
        <LoyaltyCodePanel
          open={codePanelOpen}
          code={loyaltyCode}
          loading={claimLoading}
          message={claimMessage}
          error={claimError}
          onChange={onCodeChange}
          onSubmit={onClaimCode}
        />
      </section>
    );
  }

  const metrics = getLoyaltyMetrics(loyalty);

  return (
    <section className={cn(cardClassName, "overflow-hidden border-gold/20 bg-[radial-gradient(circle_at_top_right,rgba(212,160,83,0.16),transparent_34%),#1A1A1A]")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <SectionTitle title="Votre fidélité" />
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            {metrics.threshold} passages = 1 pizza offerte
          </p>
        </div>
        <div className="max-w-[9rem] shrink-0 rounded-[16px] border border-gold/20 bg-background/55 px-3.5 py-2 text-right">
          <p className="break-words text-[22px] font-bold leading-none text-gold">
            {metrics.passages} / {metrics.threshold}
          </p>
          <p className="mt-1 text-[10px] font-medium uppercase text-text-muted">passages</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light"
            initial={{ width: 0 }}
            animate={{ width: `${metrics.progressPercent}%` }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: "easeOut" }}
          />
        </div>
        <p className="mt-3 text-[15px] font-medium leading-snug text-foreground">
          {metrics.message}
        </p>
      </div>

      {metrics.rewardsAvailable > 0 && (
        <div className="mt-4 rounded-[16px] border border-gold/30 bg-gold/10 px-4 py-3">
          <p className="text-[14px] font-semibold text-gold-light">
            {metrics.rewardsAvailable === 1
              ? "1 récompense disponible"
              : `${metrics.rewardsAvailable} récompenses disponibles`}
          </p>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            Présentez-la lors de votre prochaine commande éligible.
          </p>
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <CollapsedCodeButton open={codePanelOpen} onToggle={onToggleCode} />
        <LoyaltyCodePanel
          open={codePanelOpen}
          code={loyaltyCode}
          loading={claimLoading}
          message={claimMessage}
          error={claimError}
          onChange={onCodeChange}
          onSubmit={onClaimCode}
        />
      </div>
    </section>
  );
}

function QuickActions({
  onOrdersClick,
  onCodeClick,
}: {
  onOrdersClick: () => void;
  onCodeClick: () => void;
}) {
  return (
    <section aria-label="Actions rapides" className="grid grid-cols-3 gap-2">
      <QuickAction href="/menu" icon="bag" label="Commander" />
      <QuickAction icon="receipt" label="Commandes" onClick={onOrdersClick} />
      <QuickAction icon="ticket" label="Code" onClick={onCodeClick} />
    </section>
  );
}

function QuickAction({
  href,
  icon,
  label,
  onClick,
}: {
  href?: string;
  icon: IconName;
  label: string;
  onClick?: () => void;
}) {
  const className =
    "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[16px] border border-white/10 bg-surface px-2 text-center text-[12px] font-semibold text-foreground transition-colors active:scale-[0.98] hover:border-white/20 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";
  const content = (
    <>
      <Icon name={icon} className="h-5 w-5 text-gold" />
      <span>{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function OrdersSection({
  refProp,
  status,
  orders,
  error,
  onRetry,
}: {
  refProp: React.RefObject<HTMLElement | null>;
  status: SectionStatus;
  orders: CustomerOrderSummary[];
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section ref={refProp} className="scroll-mt-5">
      <SectionTitle title="Mes commandes" />
      <div className="mt-3">
        {(status === "loading" || status === "idle") && <OrdersSkeleton />}
        {status === "error" && <InlineError message={error ?? "Vos commandes sont indisponibles."} onRetry={onRetry} />}
        {status === "success" && orders.length === 0 && <OrdersEmptyState />}
        {status === "success" && orders.length > 0 && (
          <ul className="flex flex-col gap-3">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function OrderRow({ order }: { order: CustomerOrderSummary }) {
  const presentation = getCustomerOrderPresentation(order);
  const scheduleLabel = order.pickupLabel || order.createdAtLabel || "Créneau à confirmer";
  const orderNumber = formatOrderNumber(order.orderNumber);
  const orderStatusLabel = getReadableOrderStatus(presentation.state);
  const stateClassName =
    presentation.state === "cancelled"
      ? "text-red-300"
      : presentation.state === "validated"
        ? "text-[#A7E7B8]"
        : "text-text-secondary";

  return (
    <li className="rounded-[18px] border border-white/10 bg-surface px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-semibold text-foreground">
          {orderNumber}
        </p>
        <p className="shrink-0 text-[15px] font-semibold text-foreground">
          {formatPrice(order.totalCents)} €
        </p>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[13px]">
        <p className="min-w-0 truncate text-text-secondary">{scheduleLabel}</p>
        <p className={cn("shrink-0 font-medium", stateClassName)}>
          {orderStatusLabel}
          {presentation.state === "validated" ? " ✓" : ""}
        </p>
      </div>
    </li>
  );
}

function OrdersEmptyState() {
  return (
    <div className="rounded-[18px] border border-white/10 bg-surface px-5 py-5">
      <p className="text-[17px] font-semibold text-foreground">
        Votre prochaine pizza commence ici
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
        Vous n&apos;avez pas encore de commande récente.
      </p>
      <Link
        href="/menu"
        className="mt-4 inline-flex min-h-11 items-center rounded-[14px] bg-gold px-4 text-[14px] font-semibold text-background transition-colors hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Voir le menu
      </Link>
    </div>
  );
}

function ProfileInformationCard({
  userEmail,
  profile,
  status,
  loadError,
  formError,
  formMessage,
  saving,
  isDirty,
  onRetry,
  onProfileChange,
  onSave,
}: {
  userEmail: string;
  profile: CustomerProfile;
  status: SectionStatus;
  loadError: string | null;
  formError: string | null;
  formMessage: string | null;
  saving: boolean;
  isDirty: boolean;
  onRetry: () => void;
  onProfileChange: React.Dispatch<React.SetStateAction<CustomerProfile>>;
  onSave: () => void;
}) {
  return (
    <section className={cardClassName}>
      <SectionTitle title="Mes informations" />

      <div className="mt-4 rounded-[14px] border border-white/10 bg-background/35 px-4 py-3">
        <p className="text-[12px] font-medium uppercase text-text-muted">Email</p>
        <p className="mt-1 break-words text-[15px] text-foreground">{userEmail}</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-secondary">
          L&apos;adresse email ne peut pas être modifiée ici.
        </p>
      </div>

      {(status === "loading" || status === "idle") && <ProfileFormSkeleton />}
      {status === "error" && <InlineError message={loadError ?? "Vos informations sont indisponibles."} onRetry={onRetry} />}

      {status === "success" && (
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Nom" htmlFor="profile-display-name">
            <input
              id="profile-display-name"
              value={profile.displayName}
              onChange={(event) =>
                onProfileChange((current) => ({ ...current, displayName: event.target.value }))
              }
              className={inputClassName}
              autoComplete="name"
              aria-invalid={formError === "Le nom est obligatoire."}
            />
          </Field>
          <Field label="Téléphone" htmlFor="profile-phone">
            <input
              id="profile-phone"
              type="tel"
              value={formatFrenchPhone(profile.phone)}
              onChange={(event) =>
                onProfileChange((current) => ({ ...current, phone: event.target.value }))
              }
              className={inputClassName}
              autoComplete="tel"
            />
          </Field>
          <div className="min-h-10" aria-live="polite">
            {formError && <StatusMessage tone="error">{formError}</StatusMessage>}
            {formMessage && <StatusMessage tone="success">{formMessage}</StatusMessage>}
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !isDirty}
            className="min-h-12 rounded-[14px] bg-gradient-to-br from-gold to-gold-light px-5 text-[15px] font-semibold text-background shadow-[0_10px_28px_rgba(212,160,83,0.16)] transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-none disabled:bg-surface-3 disabled:text-text-muted disabled:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      )}
    </section>
  );
}

function AccountSecurityCard({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <section className={cardClassName}>
      <SectionTitle title="Compte et sécurité" />
      <div className="mt-3 divide-y divide-white/10">
        <Link
          href="/auth"
          className="flex min-h-12 items-center justify-between gap-3 py-2 text-[15px] font-medium text-foreground transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span>Modifier mon mot de passe</span>
          <span aria-hidden="true" className="text-text-muted">›</span>
        </Link>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left text-[15px] font-medium text-text-secondary transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span>Se déconnecter</span>
          <span aria-hidden="true" className="text-text-muted">›</span>
        </button>
      </div>
    </section>
  );
}

function CollapsedCodeButton({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 text-[14px] text-text-secondary">Vous avez un code fidélité ?</p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="loyalty-code-panel"
        onClick={onToggle}
        className="min-h-10 rounded-[12px] px-2 text-[14px] font-semibold text-gold transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {open ? "Masquer" : "Ajouter un code"} <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}

function LoyaltyCodePanel({
  open,
  code,
  loading,
  message,
  error,
  onChange,
  onSubmit,
}: {
  open: boolean;
  code: string;
  loading: boolean;
  message: string | null;
  error: string | null;
  onChange: (value: string) => void;
  onSubmit: (event?: React.FormEvent<HTMLFormElement>) => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.form
          id="loyalty-code-panel"
          onSubmit={onSubmit}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="mt-3 flex flex-col gap-3 rounded-[16px] border border-white/10 bg-background/35 p-3">
            <Field label="Votre code" htmlFor="loyalty-code">
              <input
                id="loyalty-code"
                value={code}
                onChange={(event) => onChange(event.target.value)}
                disabled={loading}
                placeholder="Ex. DZZA-1234"
                className={inputClassName}
                autoComplete="off"
              />
            </Field>
            <div className="min-h-9" aria-live="polite">
              {error && <StatusMessage tone="error">{error}</StatusMessage>}
              {message && <StatusMessage tone="success">{message}</StatusMessage>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-[14px] bg-gold px-4 text-[14px] font-semibold text-background transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {loading ? "Validation..." : "Valider"}
            </button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function getLoyaltyMetrics(loyalty: LoyaltyState | null) {
  const configuredThreshold = loyalty?.config.rewardThreshold;
  const normalizedThreshold =
    typeof configuredThreshold === "number" && Number.isFinite(configuredThreshold)
      ? Math.floor(configuredThreshold)
      : DEFAULT_REWARD_THRESHOLD;
  const threshold = normalizedThreshold >= 1 ? normalizedThreshold : DEFAULT_REWARD_THRESHOLD;
  const passages = clampNonNegativeInteger(loyalty?.account.stampsBalance ?? 0);
  const rewardsAvailable = clampNonNegativeInteger(loyalty?.account.rewardsAvailable ?? 0);
  const currentCyclePassages = threshold > 0 ? Math.min(passages, threshold) : 0;
  const remaining = Math.max(0, threshold - currentCyclePassages);
  const progressPercent = threshold > 0
    ? Math.min(100, Math.max(0, (currentCyclePassages / threshold) * 100))
    : 0;

  let message = "";
  if (rewardsAvailable > 0) {
    message = rewardsAvailable === 1
      ? "Votre récompense est prête"
      : "Vos récompenses sont prêtes";
  } else if (passages === 0) {
    message = "Votre prochaine commande lance votre progression";
  } else if (remaining === 1) {
    message = "Encore une commande";
  } else if (remaining === 0) {
    message = "Votre progression est complète";
  } else if (remaining <= 3) {
    message = `Plus que ${remaining} passages`;
  } else {
    message = `Encore ${remaining} passages avant votre pizza offerte`;
  }

  return { threshold, passages: currentCyclePassages, rewardsAvailable, progressPercent, message };
}

function formatOrderNumber(orderNumber: string) {
  const trimmed = orderNumber.trim();
  if (!trimmed) return "Commande";
  return trimmed.startsWith("#") || trimmed.toLowerCase().startsWith("commande")
    ? trimmed
    : `#${trimmed}`;
}

function getReadableOrderStatus(state: ReturnType<typeof getCustomerOrderPresentation>["state"]) {
  if (state === "cancelled") return "Annulée";
  if (state === "validated") return "Validée";
  return "Paiement en cours";
}

function clampNonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-[16px] border border-red-400/20 bg-red-950/25 px-4 py-3" aria-live="polite">
      <p className="text-[13px] leading-relaxed text-red-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 min-h-9 rounded-[12px] px-1 text-[13px] font-semibold text-gold transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Réessayer
      </button>
    </div>
  );
}

function StatusMessage({ children, tone }: { children: React.ReactNode; tone: "error" | "success" }) {
  return (
    <p
      className={cn(
        "rounded-[12px] px-3 py-2 text-[13px] leading-relaxed",
        tone === "error"
          ? "bg-red-950/30 text-red-200"
          : "bg-[#2ECC71]/10 text-[#9BE7B8]",
      )}
    >
      {children}
    </p>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-[17px] font-semibold tracking-normal text-foreground">{title}</h2>;
}

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
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

function ProfileIntroSkeleton() {
  return (
    <div className="px-1">
      <div className="h-8 w-44 animate-pulse rounded-full bg-surface-2" />
      <div className="mt-3 h-4 w-64 animate-pulse rounded-full bg-surface-2" />
    </div>
  );
}

function LoyaltyCardSkeleton() {
  return (
    <section className={cardClassName} aria-label="Chargement de la fidélité">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-5 w-28 animate-pulse rounded-full bg-surface-2" />
          <div className="h-4 w-48 animate-pulse rounded-full bg-surface-2" />
        </div>
        <div className="h-14 w-24 animate-pulse rounded-[16px] bg-surface-2" />
      </div>
      <div className="mt-5 h-2.5 animate-pulse rounded-full bg-surface-2" />
      <div className="mt-4 h-5 w-56 animate-pulse rounded-full bg-surface-2" />
    </section>
  );
}

function OrdersSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Chargement des commandes">
      {[0, 1].map((item) => (
        <div key={item} className="rounded-[18px] border border-white/10 bg-surface px-4 py-4">
          <div className="flex justify-between gap-4">
            <div className="h-4 w-24 animate-pulse rounded-full bg-surface-2" />
            <div className="h-4 w-16 animate-pulse rounded-full bg-surface-2" />
          </div>
          <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-surface-2" />
        </div>
      ))}
    </div>
  );
}

function ProfileFormSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-4" aria-label="Chargement des informations">
      <div className="h-16 animate-pulse rounded-[14px] bg-surface-2" />
      <div className="h-16 animate-pulse rounded-[14px] bg-surface-2" />
      <div className="h-12 animate-pulse rounded-[14px] bg-surface-2" />
    </div>
  );
}

type IconName = "bag" | "receipt" | "ticket";

function Icon({ name, className }: { name: IconName; className?: string }) {
  if (name === "bag") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  if (name === "receipt") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2Z" />
        <path d="M8 7h8M8 12h8M8 17h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 9a3 3 0 0 0 0 6v4a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-4a3 3 0 0 0 0-6V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z" />
      <path d="M13 5v2M13 11v2M13 17v2" />
    </svg>
  );
}

const cardClassName = "rounded-[20px] border border-white/10 bg-surface px-4 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]";

const inputClassName =
  "w-full rounded-[14px] border border-white/10 bg-surface-2 px-4 py-3 text-[16px] text-foreground outline-none transition-colors placeholder:text-text-muted focus:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60";
