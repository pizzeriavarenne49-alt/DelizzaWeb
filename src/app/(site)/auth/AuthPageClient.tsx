"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";

export default function AuthPageClient() {
  return (
    <Suspense fallback={null}>
      <AuthPageForm />
    </Suspense>
  );
}

function AuthPageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "forgot" ? "forgot" : "login";
  const next = searchParams.get("next") === "/checkout" ? "/checkout" : "/menu";

  return (
    <LoginForm
      initialMode={initialMode}
      onSuccess={() => router.replace(next)}
    />
  );
}
