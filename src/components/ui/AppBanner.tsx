"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isBannerDismissed, dismissBanner } from "@/lib/redirect";
import { track } from "@/analytics";
import Link from "next/link";

const SCROLL_THRESHOLD = 0.5; // 50% of page
const DELAY_MS = 12_000; // 12 seconds
const BANNER_HEIGHT = 56; // approximate banner height in px

export default function AppBanner() {
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (isBannerDismissed()) return;

    const show = (reason: string) => {
      if (shownRef.current) return;
      shownRef.current = true;
      setVisible(true);
      track({ name: "show_install_banner", payload: { reason } });
    };

    // Timer trigger
    const timer = setTimeout(() => show("timer_12s"), DELAY_MS);

    // Scroll trigger
    const onScroll = () => {
      const scrollPct =
        window.scrollY /
        (document.documentElement.scrollHeight - window.innerHeight || 1);
      if (scrollPct >= SCROLL_THRESHOLD) {
        show("scroll_50pct");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const handleDismiss = () => {
    dismissBanner();
    setVisible(false);
    track({ name: "close_install_banner" });
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#D4A053] to-[#E8C078] px-4 py-3 flex items-center justify-between gap-3 safe-top"
            role="banner"
            aria-label="Installer l'application"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[20px]" aria-hidden="true">🍕</span>
              <p className="text-[13px] font-semibold text-[#0D0D0D] truncate">
                Télécharge l&apos;app Deli&apos;Zza pour commander&nbsp;!
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/download"
                className="rounded-full bg-[#0D0D0D] px-4 py-1.5 text-[12px] font-bold text-[#D4A053] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4A053]"
              >
                Installer
              </Link>
              <button
                onClick={handleDismiss}
                className="text-[#0D0D0D]/60 hover:text-[#0D0D0D] text-[18px] font-bold leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0D0D0D]"
                aria-label="Fermer le bandeau"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Spacer to push content below the fixed banner when visible */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: BANNER_HEIGHT }}
            exit={{ height: 0 }}
            transition={{ type: "spring", damping: 20 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
    </>
  );
}
