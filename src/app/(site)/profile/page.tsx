import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Mon Profil — Pizza Deli'Zza",
  description:
    "Gérez votre profil Pizza Deli'Zza. Retrouvez vos informations et préférences.",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: true },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
