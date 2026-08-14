"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";

export default function AuthPageClient() {
  const router = useRouter();

  return (
    <Suspense fallback={null}>
      <LoginForm onSuccess={() => router.push("/menu")} />
    </Suspense>
  );
}
