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

  return (
    <LoginForm
      initialMode={initialMode}
      onSuccess={() => router.push("/menu")}
    />
  );
}
