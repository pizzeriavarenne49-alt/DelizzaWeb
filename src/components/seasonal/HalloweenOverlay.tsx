"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Image from "next/image";
import type { HalloweenSettings } from "@/services/website-settings";
import { mountHalloween } from "./halloween-engine";
import "./halloween-v11.css";

function Web({ side }: { side: string }) {
  return <svg className={`web ${side}`} viewBox="0 0 150 150"><g fill="none" stroke="#dbd4e9" strokeWidth="1">
    <path d="M0 0 138 138M0 0h142M0 0v142M0 0c42 15 79 48 100 89M0 0c18 47 51 82 91 105" />
    <path d="M26 0a26 26 0 0 1-26 26M55 0A55 55 0 0 1 0 55M87 0A87 87 0 0 1 0 87M122 0A122 122 0 0 1 0 122" />
  </g></svg>;
}

function Pumpkin() {
  return <svg viewBox="0 0 120 110" fill="none" focusable="false">
    <path d="M60 24Q53 10 65 3l7 5Q60 15 67 25" fill="#6b833b" />
    <path d="M60 28C18 6-12 49 10 88c12 22 30 15 50 13 20 2 38 9 50-13C132 49 102 6 60 28Z" fill="#de5817" stroke="#ff9a32" strokeWidth="2" />
    <path d="M44 28C18 42 21 84 43 101M76 28c26 14 23 56 1 73M60 30v69" stroke="#ff9a32" strokeWidth="3" opacity=".55" />
    <g className="hw-pumpkin-face" fill="#201024" stroke="#ffcf65" strokeWidth="1.5">
      <path d="m23 55 22-12-3 19ZM97 55 75 43l3 19ZM54 69l6-10 6 10Z" />
      <path className="hw-pumpkin-smile" d="m25 77 16 8 9-5 10 7 10-7 9 5 16-8-9 17-26 4-26-4Z" />
      <path className="hw-pumpkin-smile alternate" d="m23 74 19 8 8-6 10 9 10-9 8 6 19-8-12 21-13-4-12 8-12-8-13 4Z" />
    </g>
  </svg>;
}

export default function HalloweenOverlay({ settings, reducedMotion, appId, suspended }: {
  settings: HalloweenSettings; reducedMotion: boolean; appId: string; suspended: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [welcomeTarget, setWelcomeTarget] = useState<HTMLElement | null>(null);
  const controller = useRef<ReturnType<typeof mountHalloween> | null>(null);
  const seenKey = appId === "d_lizza" ? "delizza_halloween_screamer_2026_seen" : `wl_${appId}_halloween_v11_seen`;
  const [canScream, setCanScream] = useState(() => {
    try { return !localStorage.getItem(seenKey); } catch { return false; }
  });
  const storm = settings.storm && !reducedMotion;
  const ambience = settings.ambience && !reducedMotion;
  const autoScreamer = settings.autoScreamer && !reducedMotion && canScream;
  useLayoutEffect(() => {
    setWelcomeTarget(ambience && !suspended ? document.querySelector<HTMLElement>('[data-seasonal-welcome]') : null);
  }, [pathname, ambience, suspended]);
  useEffect(() => {
    const consume = (event: StorageEvent) => {
      if (event.key === seenKey && event.newValue) setCanScream(false);
    };
    window.addEventListener("storage", consume);
    return () => window.removeEventListener("storage", consume);
  }, [seenKey]);
  useLayoutEffect(() => {
    if (!host.current) return;
    const engine = mountHalloween(host.current, seenKey, () => setCanScream(false));
    controller.current = engine;
    return () => {
      engine.dispose(); controller.current = null;
      document.documentElement.removeAttribute("data-halloween-active");
      document.documentElement.removeAttribute("data-halloween-ambience");
    };
  }, [seenKey]);
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute("data-halloween-active", !suspended);
    document.documentElement.toggleAttribute("data-halloween-ambience", ambience && !suspended);
    controller.current?.update({ storm, ambience, autoScreamer }, suspended);
  }, [storm, ambience, autoScreamer, suspended, seenKey]);
  return <div ref={host} data-halloween-v11="" aria-hidden="true" hidden={suspended}>
    <div hidden={!storm}><div className="lightning" id="hw-lightning" /><div className="storm-glow" id="hw-stormGlow" /><div id="hw-stormSky" /></div>
    <div hidden={!ambience}>
      <div id="hw-batSwarm" /><div id="hw-embers" />
      <div className="ambient-vignette" /><div className="mist-bank" /><div className="mist-bank m2" />
      <div className="lurker" id="hw-lurker" /><div className="shadow-pass" id="hw-shadowPass" />
    </div>
    <div className="halloween-layer"><Web side="left" /><Web side="right" /><div className="moon-glow" />
      <div className="pumpkin-corner right"><Pumpkin /></div>
      {ambience && <><div className="halloween-aura" />
        <div className="hw-leaf-fall">{[0, 1, 2, 3, 4, 5].map(index => <span key={index} className="hw-autumn-leaf"
          style={{ left: `${4 + index * 17}%`, animationDelay: `-${index * 3 + 2}s`, animationDuration: `${16 + index * 2}s` }}>
          <svg viewBox="0 0 40 48" fill="none" focusable="false"><path d="M20 3 26 14 36 11 32 23 39 28 25 34 20 43 15 34 1 28 8 23 4 11 14 14Z" fill={index % 2 ? '#a34b29' : '#df832f'} /><path d="M20 9v37M20 25l10-8M20 29l-10-9" stroke="#572d22" strokeWidth="1.5" /></svg>
        </span>)}</div>
        {[0, 1, 2].map(index => <div key={index} className={`hanging-spider spider-${index}`}>
          <span className="spider-silk" /><Image src="/seasonal/halloween-v11/spider.svg" alt="" width={96} height={96} />
        </div>)}
        <div className="fog" /><div className="fog f2" /></>}
    </div>
    {welcomeTarget && ambience && !suspended && createPortal(<div className="hw-welcome">
      <span className="hw-welcome-jack" aria-hidden="true">🎃</span><span>La carte est hantée ce soir…<small>Les petites faims ne sont pas les seules à rôder.</small></span>
    </div>, welcomeTarget)}
    {autoScreamer && <>
      <div id="hw-screamer"><div className="scream-photo-wrap">
        <Image className="scream-photo" src="/seasonal/halloween-v11/screamer.webp" alt="" loading="eager" fill sizes="100vw" />
      </div><div className="scream-vignette" /><div className="scream-noise" /><div className="scream-scan" /><div className="scream-flash" /></div>
      <audio id="hw-realScream" preload="none" data-src="/seasonal/halloween-v11/scream.mp3" />
    </>}
  </div>;
}
