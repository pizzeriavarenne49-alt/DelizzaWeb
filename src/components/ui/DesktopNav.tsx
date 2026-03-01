"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { track } from "@/analytics";

const items = [
  {
    label: "Accueil",
    href: "/",
    trackEvent: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M3 12.5l9-9 9 9V21a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8.5z" />
      </svg>
    ),
  },
  {
    label: "Menu",
    href: "/menu",
    trackEvent: "click_menu" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
      </svg>
    ),
  },
  {
    label: "Offres",
    href: "/offers",
    trackEvent: "click_offers" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    label: "Profil",
    href: "/profile",
    trackEvent: null,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
      </svg>
    ),
  },
] as const;

export default function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden md:flex md:flex-col md:w-60 md:shrink-0 sticky top-0 h-screen border-r border-white/5 bg-[#0D0D0D] px-4 py-6"
      aria-label="Navigation principale"
    >
      <div className="mb-8 px-2">
        <span className="text-[22px] font-bold text-[#F5F5F5]">Deli&apos;Zza</span>
      </div>

      <nav className="flex flex-col gap-1">
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
                "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                active
                  ? "bg-[#D4A053]/10 text-[#D4A053]"
                  : "text-[#6B6B6B] hover:bg-[#1A1A1A] hover:text-[#F5F5F5]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4A053] focus-visible:rounded-xl",
              )}
            >
              {item.icon}
              <span className="text-[15px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
