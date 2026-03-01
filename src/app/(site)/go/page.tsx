"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { detectPlatform, getDeepLink, getStoreUrl } from "@/lib/redirect";
import { track } from "@/analytics";

const DEEP_LINK_TIMEOUT_MS = 1500;

function GoContent() {
  const searchParams = useSearchParams();
  const trigger = searchParams.get("trigger") ?? "unknown";

  useEffect(() => {
    const platform = detectPlatform();

    track({ name: "open_go", payload: { trigger, os: platform } });

    if (platform === "desktop") {
      window.location.href = `/download?from=${encodeURIComponent(trigger)}`;
      return;
    }

    // Attempt deep link
    const deepLink = getDeepLink(trigger);
    window.location.href = deepLink;

    // Fallback after timeout — if page is still visible, deep link failed
    const timer = setTimeout(() => {
      if (!document.hidden) {
        const storeUrl = getStoreUrl(platform);
        if (storeUrl.startsWith("#")) {
          // Placeholder — go to download page instead
          window.location.href = `/download?from=${encodeURIComponent(trigger)}`;
        } else {
          window.location.href = storeUrl;
        }
      }
    }, DEEP_LINK_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [trigger]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#252525] border-t-[#D4A053]" />
      <p className="text-[15px] text-[#A0A0A0]">Redirection en cours…</p>
    </div>
  );
}

export default function GoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#252525] border-t-[#D4A053]" />
        </div>
      }
    >
      <GoContent />
    </Suspense>
  );
}
