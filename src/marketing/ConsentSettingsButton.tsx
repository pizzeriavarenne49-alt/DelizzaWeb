"use client";

import { useMarketing } from "@/marketing/MarketingProvider";

export default function ConsentSettingsButton() {
  const { openPreferences } = useMarketing();
  return (
    <button
      type="button"
      onClick={openPreferences}
      className="min-h-11 rounded-md py-2 text-xs text-[#A0A0A0] transition-colors hover:text-[#D4A053] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
    >
      Gérer mes choix
    </button>
  );
}
