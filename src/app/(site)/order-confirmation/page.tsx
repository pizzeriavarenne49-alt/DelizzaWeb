import type { Metadata } from "next";
import OrderConfirmationClient from "./OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Commande confirmée — Deli'Zza",
  description: "Votre commande a été confirmée.",
  robots: { index: false },
};

export default function OrderConfirmationPage() {
  return <OrderConfirmationClient />;
}
