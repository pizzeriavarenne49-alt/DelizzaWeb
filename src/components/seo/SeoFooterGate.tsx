"use client";

import { usePathname } from "next/navigation";
import SeoFooter from "@/components/seo/SeoFooter";

const excludedPaths = new Set(["/profile"]);

export default function SeoFooterGate() {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (excludedPaths.has(normalizedPath)) return null;

  return <SeoFooter />;
}
