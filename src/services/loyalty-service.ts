"use client";

import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import {
  CLIENT_WL_APP_ID,
  getClientFirestore,
  getClientFunctions,
} from "@/config/firebase-client";

export const DEFAULT_REWARD_THRESHOLD = 10;
export const DEFAULT_PIZZA_CATEGORY_ID = "pizza";

export interface LoyaltyAccount {
  stampsBalance: number;
  rewardsAvailable: number;
}

export interface LoyaltyConfig {
  rewardThreshold: number;
  pizzaCategoryId: string;
  eligiblePizzaCategoryIds: string[];
  sizeTemplateId: string;
  classicSizeChoiceIds: string[];
}

export interface LoyaltyState {
  account: LoyaltyAccount;
  config: LoyaltyConfig;
}

export interface ClaimLoyaltyTicketCodeResult {
  success: boolean;
  stampsBalance?: number;
  claimedCode?: string;
  orderId?: string;
  rewardIssued?: boolean;
  idempotent?: boolean;
}

const defaultAccount: LoyaltyAccount = {
  stampsBalance: 0,
  rewardsAvailable: 0,
};

const defaultConfig: LoyaltyConfig = {
  rewardThreshold: DEFAULT_REWARD_THRESHOLD,
  pizzaCategoryId: DEFAULT_PIZZA_CATEGORY_ID,
  eligiblePizzaCategoryIds: [DEFAULT_PIZZA_CATEGORY_ID],
  sizeTemplateId: "taille",
  classicSizeChoiceIds: ["classique"],
};

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    : [];
}

function mapAccount(data: Record<string, unknown> | undefined): LoyaltyAccount {
  if (!data) return defaultAccount;
  return {
    stampsBalance: num(data.stampsBalance ?? data.stamps ?? data.currentStamps, 0),
    rewardsAvailable: num(data.rewardsAvailable ?? data.availableRewards, 0),
  };
}

function mapConfig(data: Record<string, unknown> | undefined): LoyaltyConfig {
  if (!data) return defaultConfig;

  const pizzaCategoryId = str(
    data.pizzaCategoryId ?? data.eligiblePizzaCategoryId,
    DEFAULT_PIZZA_CATEGORY_ID,
  );
  const configuredCategoryIds = [
    ...strArray(data.eligiblePizzaCategoryIds),
    ...strArray(data.pizzaCategoryIds),
  ];
  const eligiblePizzaCategoryIds =
    configuredCategoryIds.length > 0 ? configuredCategoryIds : [pizzaCategoryId];
  const classicSizeChoiceIds = strArray(data.classicSizeChoiceIds);

  return {
    rewardThreshold: num(data.rewardThreshold ?? data.stampsRequired, DEFAULT_REWARD_THRESHOLD),
    pizzaCategoryId,
    eligiblePizzaCategoryIds,
    sizeTemplateId: str(data.sizeTemplateId, defaultConfig.sizeTemplateId),
    classicSizeChoiceIds:
      classicSizeChoiceIds.length > 0
        ? classicSizeChoiceIds
        : defaultConfig.classicSizeChoiceIds,
  };
}

export async function getLoyaltyState(appId: string, uid: string): Promise<LoyaltyState> {
  if (!appId || !uid) {
    return {
      account: defaultAccount,
      config: defaultConfig,
    };
  }

  const db = getClientFirestore();
  const [accountSnap, configSnap] = await Promise.all([
    getDoc(doc(db, "loyalty_accounts", `${appId}_${uid}`)),
    getDoc(doc(db, "loyalty_config", appId)),
  ]);

  return {
    account: mapAccount(accountSnap.exists() ? accountSnap.data() : undefined),
    config: mapConfig(configSnap.exists() ? configSnap.data() : undefined),
  };
}

export async function claimLoyaltyTicketCode(
  code: string,
): Promise<ClaimLoyaltyTicketCodeResult> {
  const functions = getClientFunctions();
  const callable = httpsCallable(functions, "claimLoyaltyTicketCode");
  const result = await callable({
    code: code.trim(),
    appId: CLIENT_WL_APP_ID,
  });

  return result.data as ClaimLoyaltyTicketCodeResult;
}

export function getLoyaltyClaimErrorMessage(error: unknown): string {
  const err = typeof error === "object" && error !== null
    ? (error as { details?: unknown; code?: unknown })
    : {};
  const details = typeof err.details === "object" && err.details !== null
    ? (err.details as { reason?: unknown })
    : null;
  const reason = typeof details?.reason === "string" ? details.reason.toLowerCase() : "";
  const code = typeof err.code === "string"
    ? err.code.toLowerCase().replace(/^functions\//, "")
    : "";

  const reasonMessages: Record<string, string> = {
    "invalid-code": "Ce code fidélité est invalide. Vérifiez-le puis réessayez.",
    "no-stamps-to-credit": "Ce code fidélité ne contient aucun passage à créditer.",
    "expired-code": "Ce code fidélité a expiré.",
    "already-redeemed": "Ce code fidélité a déjà été utilisé.",
    "app-mismatch": "Ce code fidélité n'appartient pas à Deli'Zza.",
    "customer-account-required": "Un compte client Deli'Zza actif est nécessaire pour valider ce code.",
    "customer-account-inactive": "Votre compte client est inactif. Contactez Deli'Zza pour obtenir de l'aide.",
    "loyalty-disabled": "Le programme fidélité est momentanément indisponible.",
  };
  if (reason && reasonMessages[reason]) return reasonMessages[reason];

  const codeMessages: Record<string, string> = {
    "invalid-argument": "Ce code fidélité est invalide. Vérifiez-le puis réessayez.",
    "not-found": "Ce code fidélité est introuvable. Vérifiez-le puis réessayez.",
    "already-exists": "Ce code fidélité a déjà été utilisé.",
    "permission-denied": "Votre compte client ne permet pas de valider ce code fidélité.",
    "failed-precondition": "La validation sécurisée du code a échoué. Actualisez la page puis réessayez.",
    "resource-exhausted": "Trop de tentatives. Patientez 15 minutes avant de réessayer.",
    "unauthenticated": "Reconnectez-vous pour valider ce code fidélité.",
    "unavailable": "La connexion au service fidélité est impossible. Vérifiez votre connexion internet.",
    "deadline-exceeded": "La validation du code a pris trop de temps. Vérifiez votre connexion puis réessayez.",
    "cancelled": "La validation du code a été interrompue. Réessayez.",
    "internal": "Le service fidélité rencontre un problème. Réessayez dans quelques instants.",
    "unknown": "Le service fidélité rencontre un problème. Réessayez dans quelques instants.",
  };
  if (code && codeMessages[code]) return codeMessages[code];

  return "Une erreur est survenue lors de la validation du code. Réessayez.";
}
