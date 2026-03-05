import type { Metadata } from "next";
import DownloadClient from "./DownloadClient";

export const metadata: Metadata = {
  title: "Télécharger l'application — Pizza Deli'Zza",
  description:
    "Téléchargez l'application Pizza Deli'Zza pour commander vos pizzas artisanales en click & collect depuis La Varenne et ses alentours.",
  alternates: { canonical: "/download" },
};

export default function DownloadPage() {
  return <DownloadClient />;
}
