export type ClientErrorContext =
  | "auth"
  | "checkout"
  | "payment"
  | "slots"
  | "server";

export const CLIENT_ERROR_MESSAGES = {
  invalidEmail: "L'adresse e-mail n'est pas valide.",
  invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
  weakPassword: "Le mot de passe est trop faible.",
  emailAlreadyUsed: "Cette adresse e-mail est déjà utilisée.",
  passwordResetSent:
    "Si un compte existe avec cette adresse, un e-mail de réinitialisation a été envoyé.",
  tooManyAttempts: "Trop de tentatives. Réessayez dans quelques minutes.",
  network: "Connexion impossible. Vérifiez votre connexion internet.",
  slotUnavailable: "Ce créneau n'est plus disponible. Choisissez un autre horaire.",
  invalidCart: "Votre panier ne peut pas être validé. Vérifiez son contenu.",
  productNotFound: "Un produit de votre panier est introuvable.",
  productUnavailable: "Un produit de votre panier n'est plus disponible.",
  productOutOfStock: "Produit en rupture.",
  paymentDeclined: "Le paiement a été refusé. Essayez une autre carte.",
  orderFailed:
    "Impossible de finaliser la commande. Réessayez dans quelques instants.",
  server: "Une erreur serveur est survenue. Réessayez dans quelques instants.",
  unknown: "Une erreur est survenue. Réessayez dans quelques instants.",
} as const;

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  details?: unknown;
  type?: unknown;
  decline_code?: unknown;
};

function readErrorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? (error as ErrorLike) : {};
}

function asLowerText(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function readCode(error: unknown): string {
  const err = readErrorLike(error);
  return asLowerText(err.code);
}

function readTechnicalText(error: unknown): string {
  const err = readErrorLike(error);
  return [
    err.code,
    err.name,
    err.message,
    err.details,
    err.type,
    err.decline_code,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

export function getClientErrorMessage(
  error: unknown,
  context: ClientErrorContext = "server",
): string {
  const code = readCode(error);
  const text = readTechnicalText(error);

  if (hasAny(text, ["network", "fetch", "offline", "unavailable"])) {
    return CLIENT_ERROR_MESSAGES.network;
  }

  if (
    hasAny(text, [
      "too-many-requests",
      "resource-exhausted",
      "rate-limit",
      "rate_limit",
    ])
  ) {
    return context === "slots"
      ? CLIENT_ERROR_MESSAGES.slotUnavailable
      : CLIENT_ERROR_MESSAGES.tooManyAttempts;
  }

  if (code.startsWith("auth/") || text.includes("auth/")) {
    if (
      hasAny(text, [
        "invalid-email",
        "missing-email",
        "email badly formatted",
      ])
    ) {
      return CLIENT_ERROR_MESSAGES.invalidEmail;
    }

    if (
      hasAny(text, [
        "invalid-credential",
        "wrong-password",
        "user-not-found",
        "invalid-login-credentials",
        "user-disabled",
      ])
    ) {
      return CLIENT_ERROR_MESSAGES.invalidCredentials;
    }

    if (text.includes("weak-password")) {
      return CLIENT_ERROR_MESSAGES.weakPassword;
    }

    if (text.includes("email-already-in-use")) {
      return CLIENT_ERROR_MESSAGES.emailAlreadyUsed;
    }

    if (text.includes("too-many-requests")) {
      return CLIENT_ERROR_MESSAGES.tooManyAttempts;
    }

    return context === "auth"
      ? CLIENT_ERROR_MESSAGES.invalidCredentials
      : CLIENT_ERROR_MESSAGES.unknown;
  }

  if (code.startsWith("functions/") || text.includes("functions/")) {
    if (hasAny(text, ["introuvable", "not-found", "not found"])) {
      return CLIENT_ERROR_MESSAGES.productNotFound;
    }

    if (
      hasAny(text, [
        "plus disponible",
        "out-of-stock",
        "out of stock",
        "stock insuffisant",
        "disponibilite insuffisante",
        "disponibilité insuffisante",
      ])
    ) {
      return CLIENT_ERROR_MESSAGES.productOutOfStock;
    }

    if (
      hasAny(text, [
        "permission-denied",
        "permission denied",
        "not authorized",
        "does not have access",
      ])
    ) {
      return context === "checkout"
        ? CLIENT_ERROR_MESSAGES.orderFailed
        : CLIENT_ERROR_MESSAGES.server;
    }

    if (
      hasAny(text, [
        "resource-exhausted",
        "already-exists",
        "aborted",
        "failed-precondition",
      ])
    ) {
      return context === "slots"
        ? CLIENT_ERROR_MESSAGES.slotUnavailable
        : CLIENT_ERROR_MESSAGES.orderFailed;
    }

    if (hasAny(text, ["invalid-argument", "out-of-range"])) {
      return CLIENT_ERROR_MESSAGES.invalidCart;
    }

    if (hasAny(text, ["unavailable", "deadline-exceeded"])) {
      return CLIENT_ERROR_MESSAGES.network;
    }

    if (context === "checkout") {
      return CLIENT_ERROR_MESSAGES.orderFailed;
    }

    return CLIENT_ERROR_MESSAGES.server;
  }

  if (
    context === "payment" ||
    hasAny(text, [
      "card_declined",
      "payment_intent",
      "stripe",
      "incorrect_cvc",
      "expired_card",
      "processing_error",
    ])
  ) {
    return CLIENT_ERROR_MESSAGES.paymentDeclined;
  }

  if (
    context === "slots" ||
    hasAny(text, ["slot", "creneau", "créneau", "timeslot", "time slot", "full"])
  ) {
    return CLIENT_ERROR_MESSAGES.slotUnavailable;
  }

  if (
    hasAny(text, [
      "cart",
      "panier",
      "invalid-argument",
      "failed-precondition",
      "out-of-stock",
      "not available",
    ])
  ) {
    return CLIENT_ERROR_MESSAGES.invalidCart;
  }

  if (context === "checkout") {
    return CLIENT_ERROR_MESSAGES.orderFailed;
  }

  if (
    hasAny(text, [
      "internal",
      "server",
      "functions/internal",
      "deadline-exceeded",
      "data-loss",
    ])
  ) {
    return CLIENT_ERROR_MESSAGES.server;
  }

  return CLIENT_ERROR_MESSAGES.unknown;
}
