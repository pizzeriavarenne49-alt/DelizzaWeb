import type { Metadata } from "next";
import DownloadClient from "./DownloadClient";

export const metadata: Metadata = {
  title: "Télécharger l'app — Pizza Deli'Zza",
};

export default function DownloadPage() {
  return <DownloadClient />;
}
