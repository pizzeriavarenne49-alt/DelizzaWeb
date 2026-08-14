export function normalizeFrenchPhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const compact = raw.replace(/[\s().-]/g, "");
  if (/^0[1-9]\d{8}$/.test(compact)) {
    return `+33${compact.slice(1)}`;
  }
  if (/^\+33[1-9]\d{8}$/.test(compact)) {
    return compact;
  }
  if (/^0033[1-9]\d{8}$/.test(compact)) {
    return `+${compact.slice(2)}`;
  }
  return null;
}

export function formatFrenchPhone(input: string | null | undefined): string {
  if (!input) return "";
  if (/^\+33[1-9]\d{8}$/.test(input)) {
    return `0${input.slice(3)}`.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return input;
}
