"use client";

import { cn } from "@/lib/cn";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Rechercher…",
}: SearchBarProps) {
  return (
    <div className="relative" role="search">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B6B]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 5.65 5.65a7.5 7.5 0 0 0 10.99 10.99z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "w-full rounded-[18px] bg-[#252525]/80 backdrop-blur-sm pl-11 pr-4 py-3",
          "text-[15px] text-[#F5F5F5] placeholder:text-[#6B6B6B]",
          "border border-white/5 transition-all duration-200",
          "focus:border-[#D4A053]/50 focus:shadow-[0_0_0_3px_rgba(212,160,83,0.15)] focus:outline-none",
        )}
      />
    </div>
  );
}
