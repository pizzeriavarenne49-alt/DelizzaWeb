"use client";

import { usePathname } from "next/navigation";
import SeoFooter from "@/components/seo/SeoFooter";
import ConsentSettingsButton from "@/marketing/ConsentSettingsButton";

const excludedPaths = new Set(["/profile"]);

export default function SeoFooterGate() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (excludedPaths.has(normalizedPath)) {
    return <footer className="px-4 pb-4 pt-8"><ConsentSettingsButton /></footer>;
  }

  return <SeoFooter />;
}
