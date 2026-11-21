import type { Product } from "@/types";
import PizzaDuoVisual from "@/components/ui/PizzaDuoVisual";

/** Shared premium plate for a single catalogue pizza or a Pizza Duo. */
export default function PizzaPlate({ product, left, right }: { product?: Product; left?: Product; right?: Product }) {
  const first = product ?? left;
  return <PizzaDuoVisual left={first} right={right} variant={right ? "duo" : "single"} />;
}
