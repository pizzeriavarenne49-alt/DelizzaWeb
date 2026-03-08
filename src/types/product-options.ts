/** Product option types — mirror of WLHORIZON Flutter app */

export interface OptionChoice {
  id: string;
  name: string;
  priceModifier: { amountCents: number; currency: string };
  isActive: boolean;
}

export type OptionType = "single" | "multiple";

export interface ProductOption {
  id: string;
  name: string;
  type: OptionType;
  required: boolean;
  choices: OptionChoice[];
  order: number;
}
