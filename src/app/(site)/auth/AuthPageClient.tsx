"use client";

import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";

export default function AuthPageClient() {
  const router = useRouter();

  return (
    <LoginForm onSuccess={() => router.push("/menu")} />
  );
}
