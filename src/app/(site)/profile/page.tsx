import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Mon Profil — Pizza Deli'Zza",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
