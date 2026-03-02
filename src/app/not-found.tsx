import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center bg-[#0D0D0D]">
      <span className="text-[64px]" aria-hidden="true">🍕</span>
      <div>
        <h1 className="text-[48px] font-bold text-[#D4A053]">404</h1>
        <h2 className="mt-2 text-[22px] font-bold text-[#F5F5F5]">
          Page introuvable
        </h2>
        <p className="mt-2 text-[13px] text-[#A0A0A0]">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-[18px] bg-gradient-to-br from-[#D4A053] to-[#E8C078] px-6 py-2.5 text-[15px] font-semibold text-[#0D0D0D] shadow-[0_4px_20px_rgba(212,160,83,0.3)] active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A053]"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
