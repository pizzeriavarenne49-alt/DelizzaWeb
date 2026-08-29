"use client";

import { doc, getDoc } from "firebase/firestore";
import { getClientFirestore } from "@/config/firebase-client";
import type { CartItem, SelectedOption } from "@/types/cart";

const WL_APP_ID = process.env.NEXT_PUBLIC_WL_APP_ID ?? process.env.WL_APP_ID ?? "d_lizza";

type LiveChoice = {
  id: string;
  name: string;
};

type LiveOption = {
  id: string;
  name: string;
  choices: LiveChoice[];
};

type LiveProduct = {
  appId: string;
  name: string;
  categoryId: string;
  isActive: boolean;
  visible: boolean | null;
  published: boolean | null;
  archived: boolean | null;
  deleted: boolean | null;
  stock: number | null;
  stockManaged: boolean;
  manualOutOfStock: boolean;
  priceCents: number;
  options: LiveOption[];
};

export type CartAvailabilityIssueKind =
  | "product_not_found"
  | "product_unavailable"
  | "product_out_of_stock"
  | "option_unavailable";

export interface CartAvailabilityIssue {
  cartKey: string;
  catalogItemId: string;
  productName: string;
  kind: CartAvailabilityIssueKind;
  message: string;
  displayLabel: string;
}

export interface CartAvailabilityResult {
  ok: boolean;
  issues: CartAvailabilityIssue[];
}

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
};

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function priceCentsFromData(data: Record<string, unknown>): number {
  const money = typeof data.price === "object" && data.price !== null
    ? (data.price as Record<string, unknown>)
    : null;
  if (typeof money?.amountCents === "number") return money.amountCents;
  return typeof data.priceCents === "number" ? data.priceCents : 0;
}

function parseInlineOptions(raw: unknown): LiveOption[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry): LiveOption | null => {
      if (typeof entry !== "object" || entry === null) return null;
      const option = entry as Record<string, unknown>;
      const choices = Array.isArray(option.choices)
        ? option.choices
            .map((choice): LiveChoice | null => {
              if (typeof choice !== "object" || choice === null) return null;
              const current = choice as Record<string, unknown>;
              return typeof current.isActive === "boolean" && current.isActive
                ? {
                    id: stringOrEmpty(current.id),
                    name: stringOrEmpty(current.name),
                  }
                : null;
            })
            .filter((choice): choice is LiveChoice => choice !== null && choice.id.trim() !== "")
        : [];

      return {
        id: stringOrEmpty(option.id),
        name: stringOrEmpty(option.name),
        choices,
      };
    })
    .filter((option): option is LiveOption => option !== null && option.id.trim() !== "");
}

function parseTemplateOption(id: string, data: Record<string, unknown>): LiveOption {
  const choices = Array.isArray(data.choices)
    ? data.choices
        .map((choice): LiveChoice | null => {
          if (typeof choice !== "object" || choice === null) return null;
          const current = choice as Record<string, unknown>;
          return typeof current.isActive === "boolean" && current.isActive
            ? {
                id: stringOrEmpty(current.id),
                name: stringOrEmpty(current.name),
              }
            : null;
        })
        .filter((choice): choice is LiveChoice => choice !== null && choice.id.trim() !== "")
    : [];

  return {
    id,
    name: stringOrEmpty(data.name),
    choices,
  };
}

async function loadLiveOptions(data: Record<string, unknown>): Promise<LiveOption[]> {
  const inlineOptions = parseInlineOptions(data.options);
  const templateIds = stringArray(data.appliedTemplateIds);
  if (templateIds.length === 0) return inlineOptions;

  const db = getClientFirestore();
  const templateDocs = await Promise.all(
    templateIds.map(async (templateId) => {
      const snap = await getDoc(doc(db, "wl_option_templates", templateId));
      if (!snap.exists()) return null;
      const templateData = snap.data();
      if (templateData.appId !== WL_APP_ID) return null;
      return parseTemplateOption(snap.id, templateData);
    }),
  );

  return [
    ...templateDocs.filter((option): option is LiveOption => option !== null),
    ...inlineOptions,
  ];
}

async function loadLiveProduct(catalogItemId: string): Promise<LiveProduct | null> {
  const db = getClientFirestore();
  const snap = await getDoc(doc(db, "wl_catalog_items", catalogItemId));
  if (!snap.exists()) return null;

  const data = snap.data();
  if (data.appId !== WL_APP_ID) return null;

  return {
    appId: stringOrEmpty(data.appId),
    name: stringOrEmpty(data.name),
    categoryId: stringOrEmpty(data.categoryId),
    isActive: typeof data.isActive === "boolean" ? data.isActive : true,
    visible: boolOrNull(data.visible),
    published: boolOrNull(data.published),
    archived: boolOrNull(data.archived),
    deleted: boolOrNull(data.deleted),
    stock: numberOrNull(data.stock),
    stockManaged: typeof data.stockManaged === "boolean" ? data.stockManaged : false,
    manualOutOfStock: typeof data.manualOutOfStock === "boolean" ? data.manualOutOfStock : false,
    priceCents: priceCentsFromData(data),
    options: await loadLiveOptions(data),
  };
}

function displayName(item: CartItem, liveName?: string): string {
  const resolved = typeof liveName === "string" && liveName.trim() ? liveName.trim() : item.nameSnapshot.trim();
  return resolved || "Ce produit";
}

function validateSelectedOptions(
  item: CartItem,
  productName: string,
  options: LiveOption[],
): CartAvailabilityIssue | null {
  if (!item.selectedOptions || item.selectedOptions.length === 0) return null;

  const optionMap = new Map(options.map((option) => [option.id, option]));

  for (const selected of item.selectedOptions) {
    const invalidIssue = validateSelectedOption(item, productName, selected, optionMap);
    if (invalidIssue) return invalidIssue;
  }

  return null;
}

function validateSelectedOption(
  item: CartItem,
  productName: string,
  selected: SelectedOption,
  optionMap: Map<string, LiveOption>,
): CartAvailabilityIssue | null {
  const liveOption = optionMap.get(selected.optionId);
  if (!liveOption) {
    return {
      cartKey: item.cartKey,
      catalogItemId: item.catalogItemId,
      productName,
      kind: "option_unavailable",
      message: `Une option sélectionnée sur ${productName} n'est plus disponible. Merci de modifier cet article.`,
      displayLabel: `${productName} — option indisponible`,
    };
  }

  const liveChoiceIds = new Set(liveOption.choices.map((choice) => choice.id));
  const hasMissingChoice = selected.choiceIds.some((choiceId) => !liveChoiceIds.has(choiceId));
  if (!hasMissingChoice) return null;

  return {
    cartKey: item.cartKey,
    catalogItemId: item.catalogItemId,
    productName,
    kind: "option_unavailable",
    message: `Une option sélectionnée sur ${productName} n'est plus disponible. Merci de modifier cet article.`,
    displayLabel: `${productName} — option indisponible`,
  };
}

function buildProductIssue(
  item: CartItem,
  productName: string,
  kind: CartAvailabilityIssueKind,
  message: string,
  suffix: string,
): CartAvailabilityIssue {
  return {
    cartKey: item.cartKey,
    catalogItemId: item.catalogItemId,
    productName,
    kind,
    message,
    displayLabel: `${productName} — ${suffix}`,
  };
}

export async function assessCartAvailability(items: CartItem[]): Promise<CartAvailabilityResult> {
  if (items.length === 0) {
    return { ok: true, issues: [] };
  }

  const productCache = new Map<string, LiveProduct | null>();
  await Promise.all(
    [...new Set(items.map((item) => item.catalogItemId))].map(async (catalogItemId) => {
      productCache.set(catalogItemId, await loadLiveProduct(catalogItemId));
    }),
  );

  const issues: CartAvailabilityIssue[] = [];

  for (const item of items) {
    const product = productCache.get(item.catalogItemId);
    const productName = displayName(item, product?.name);

    if (!product) {
      issues.push(
        buildProductIssue(
          item,
          productName,
          "product_not_found",
          `${productName} n'est plus disponible.`,
          "indisponible",
        ),
      );
      continue;
    }

    if (
      product.isActive !== true ||
      product.visible === false ||
      product.published === false ||
      product.archived === true ||
      product.deleted === true ||
      !product.categoryId ||
      product.priceCents <= 0
    ) {
      issues.push(
        buildProductIssue(
          item,
          productName,
          "product_unavailable",
          `${productName} n'est plus disponible.`,
          "indisponible",
        ),
      );
      continue;
    }

    if (product.manualOutOfStock === true) {
      issues.push(
        buildProductIssue(
          item,
          productName,
          "product_out_of_stock",
          `${productName} est en rupture.`,
          "en rupture",
        ),
      );
      continue;
    }

    if (product.stockManaged === true && product.stock !== null && product.stock <= 0) {
      issues.push(
        buildProductIssue(
          item,
          productName,
          "product_out_of_stock",
          `${productName} est en rupture.`,
          "en rupture",
        ),
      );
      continue;
    }

    const optionIssue = validateSelectedOptions(item, productName, product.options);
    if (optionIssue) {
      issues.push(optionIssue);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function readErrorStrings(error: unknown): string[] {
  if (typeof error !== "object" || error === null) return [];
  const err = error as ErrorLike;
  const details =
    typeof err.details === "object" && err.details !== null
      ? (err.details as Record<string, unknown>)
      : null;

  return [
    err.message,
    details?.message,
    details?.reason,
  ].filter((value): value is string => typeof value === "string" && value.trim() !== "");
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

export function extractCartAvailabilityMessageFromError(
  error: unknown,
  items: CartItem[],
): string | null {
  const messages = readErrorStrings(error);
  for (const message of messages) {
    const trimmed = message.trim();
    const normalized = normalizeText(trimmed);
    if (
      normalized.includes("n'est plus disponible") ||
      normalized.includes("est en rupture") ||
      normalized.includes("une option sélectionnée sur")
    ) {
      return trimmed;
    }
  }

  for (const message of messages) {
    const optionMatch = message.match(/catalog item "([^"]+)"/i);
    if (!optionMatch) continue;
    const matchingItem = items.find((item) => item.catalogItemId === optionMatch[1]);
    if (!matchingItem) continue;
    return `Une option sélectionnée sur ${matchingItem.nameSnapshot} n'est plus disponible. Merci de modifier cet article.`;
  }

  const normalizedText = normalizeText(messages.join(" "));
  if (
    normalizedText.includes('choice "') ||
    normalizedText.includes('option "') ||
    normalizedText.includes("selectedlegacyoptions") ||
    normalizedText.includes("selectedtemplateoptions") ||
    normalizedText.includes("option template not found")
  ) {
    const firstConfiguredItem = items.find((item) => (item.selectedOptions?.length ?? 0) > 0);
    if (firstConfiguredItem) {
      return `Une option sélectionnée sur ${firstConfiguredItem.nameSnapshot} n'est plus disponible. Merci de modifier cet article.`;
    }
    return "Une option sélectionnée n'est plus disponible. Merci de modifier votre article.";
  }

  return null;
}
