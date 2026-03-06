import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Commande — Deli'Zza",
  description: "Finalisez votre commande Pizza Deli'Zza.",
  robots: { index: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
