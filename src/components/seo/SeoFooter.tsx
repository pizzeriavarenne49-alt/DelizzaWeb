import Link from "next/link";

const links = [
  { href: "/notre-savoir-faire", label: "Notre savoir-faire" },
  { href: "/pizza-champtoceaux", label: "Pizza Champtoceaux" },
  { href: "/pizzeria-ancenis", label: "Pizzeria Ancenis" },
  { href: "/pizza-drain", label: "Pizza Drain" },
  { href: "/pizzeria-oudon", label: "Pizzeria Oudon" },
  { href: "/pizza-la-varenne", label: "Pizza La Varenne" },
  { href: "/pizzeria-oree-danjou", label: "Pizzeria Orée d'Anjou" },
  { href: "/pizza-saint-florent-le-vieil", label: "Pizza Saint-Florent-le-Vieil" },
  { href: "/privacy", label: "Confidentialité" },
  { href: "/cgu", label: "CGU" },
];

export default function SeoFooter() {
  return (
    <footer className="px-4 pb-4 pt-8">
      <nav
        className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#333]"
        aria-label="Plan du site"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="hover:text-[#555] transition-colors"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="mt-2 text-[10px] text-[#2A2A2A]">
        © 2025 Pizza Deli&apos;Zza — Pizzeria artisanale à La Varenne, Orée d&apos;Anjou
      </p>
    </footer>
  );
}
