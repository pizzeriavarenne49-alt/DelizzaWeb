import Link from "next/link";
import ConsentSettingsButton from "@/marketing/ConsentSettingsButton";
import { BUSINESS } from "@/lib/seo";

const links = [
  { href: "/notre-savoir-faire", label: "Notre savoir-faire" },
  { href: "/pizza-champtoceaux", label: "Pizza Champtoceaux" },
  { href: "/pizzeria-ancenis", label: "Pizzeria depuis Ancenis" },
  { href: "/pizza-drain", label: "Pizza Drain" },
  { href: "/pizzeria-oudon", label: "Pizzeria depuis Oudon" },
  { href: "/pizza-la-varenne", label: "Pizza La Varenne" },
  { href: "/pizzeria-oree-danjou", label: "Pizzeria Orée d'Anjou" },
  { href: "/pizza-saint-florent-le-vieil", label: "Pizza Saint-Florent-le-Vieil" },
  { href: "/privacy", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
  { href: "/mentions-legales", label: "Mentions légales" },
];

export default function SeoFooter() {
  return (
    <footer className="px-4 pb-4 pt-8">
      <div className="mb-5 border-t border-white/10 pt-6 text-sm leading-7 text-[#B8B1A7]">
        <p className="font-semibold text-[#F5F5F5]">Deli&apos;Zza · Pizzas à emporter à La Varenne</p>
        <p>{BUSINESS.address.streetAddress}, La Varenne · {BUSINESS.address.postalCode} {BUSINESS.address.addressLocality}</p>
        <p>Horaires d&apos;hiver · {BUSINESS.openingHoursText}. Lundi et mardi : fermés.</p>
      </div>
      <nav
        className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#A0A0A0]"
        aria-label="Plan du site"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex min-h-10 items-center hover:text-[#F5F5F5] transition-colors focus-visible:outline-2 focus-visible:outline-[#D4A053]"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-3 border-t border-white/5 pt-1">
        <ConsentSettingsButton />
      </div>
      <p className="mt-2 text-[11px] text-[#A0A0A0]">
        © {new Date().getFullYear()} Pizza Deli&apos;Zza — Pizzeria à La Varenne, Orée d&apos;Anjou
      </p>
    </footer>
  );
}
