import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pizza Deli'Zza — Commandez en ligne",
  description:
    "Découvrez nos pizzas artisanales premium, nos offres exclusives et commandez depuis l'app Deli'Zza.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0D0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
