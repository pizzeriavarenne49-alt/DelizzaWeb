"use client";

import { doc, getDoc } from "firebase/firestore";
import { getClientFirestore } from "@/config/firebase-client";

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
}

export interface LoyaltyState {
  account: LoyaltyAccount;
  config: LoyaltyConfig;
}

const defaultAccount: LoyaltyAccount = {
  stampsBalance: 0,
  rewardsAvailable: 0,
};

const defaultConfig: LoyaltyConfig = {
  rewardThreshold: DEFAULT_REWARD_THRESHOLD,
  pizzaCategoryId: DEFAULT_PIZZA_CATEGORY_ID,
  eligiblePizzaCategoryIds: [DEFAULT_PIZZA_CATEGORY_ID],
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

  return {
    rewardThreshold: num(data.rewardThreshold ?? data.stampsRequired, DEFAULT_REWARD_THRESHOLD),
    pizzaCategoryId,
    eligiblePizzaCategoryIds,
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
