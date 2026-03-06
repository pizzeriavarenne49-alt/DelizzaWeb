"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { track } from "@/analytics";
import { CartButton } from "@/components/ui/SiteProviders";

const items = [
  {
    label: "Accueil",
    href: "/",
    trackEvent: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path d="M3 12.5l9-9 9 9V21a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8.5z" />
      </svg>
    ),
  },
  {
    label: "Menu",
    href: "/menu",
    trackEvent: "click_menu" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
      </svg>
    ),
  },
  {
    label: "Offres",
    href: "/offers",
    trackEvent: "click_offers" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    label: "Profil",
    href: "/profile",
    trackEvent: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
        <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
      </svg>
    ),
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#0D0D0D]/90 backdrop-blur-xl safe-bottom md:hidden"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (item.trackEvent) {
                  track({ name: item.trackEvent });
                }
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-0.5",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4A053] focus-visible:rounded-xl",
              )}
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors",
                  active ? "text-[#D4A053]" : "text-[#6B6B6B]",
                )}
              >
                {item.icon}
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}

        {/* Cart */}
        <motion.div
          whileTap={{ scale: 0.85 }}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[#6B6B6B]"
        >
          <CartButton />
          <span className="text-[10px] font-medium">Panier</span>
        </motion.div>
      </div>
    </nav>
  );
}
