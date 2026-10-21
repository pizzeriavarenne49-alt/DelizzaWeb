"use client";

import { useEffect } from "react";
import { track } from "@/analytics";
import { useAuth } from "@/contexts/AuthContext";

/** Only personalization and the existing analytics event require hydration. */
export default function HomeClient() {
  const { user } = useAuth();
  useEffect(() => {
    track({ name: "view_home" });
    const onOrderClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-home-order]") : null;
      if (link) track({ name: "click_hero_cta", payload: { slideId: link.dataset.homeOrder || "home" } });
    };
    document.addEventListener("click", onOrderClick);
    return () => document.removeEventListener("click", onOrderClick);
  }, []);
  const rawName = user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0];
  const name = rawName && /^[a-zA-ZÀ-ÿ]/.test(rawName) ? rawName : null;
  return <p className="home-greeting" data-seasonal-welcome="">{name ? `Bonjour ${name}, faites-vous plaisir.` : "Bienvenue chez Deli’Zza."}</p>;
}
