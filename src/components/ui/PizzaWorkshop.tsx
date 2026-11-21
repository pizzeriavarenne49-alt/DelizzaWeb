import type { ReactNode, Ref } from "react";
import { formatPrice } from "@/types";

interface Props {
  title: string;
  titleId?: string;
  description: string;
  preview: ReactNode;
  previewTitle: string;
  previewDetails?: ReactNode;
  unitPriceCents: number;
  totalCents: number;
  steps: readonly string[];
  activeStep: number;
  onClose: () => void;
  returnLabel?: string;
  onBack?: () => void;
  actionLabel: string;
  actionDisabled?: boolean;
  actionTestId?: string;
  onAction: () => void;
  warning?: ReactNode;
  compact?: boolean;
  scrollRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}

export default function PizzaWorkshop({
  title,
  titleId,
  description,
  preview,
  previewTitle,
  previewDetails,
  unitPriceCents,
  totalCents,
  steps,
  activeStep,
  onClose,
  returnLabel = "Retour à la carte",
  onBack,
  actionLabel,
  actionDisabled,
  actionTestId,
  onAction,
  warning,
  compact = false,
  scrollRef,
  children,
}: Props) {
  return (
    <div ref={scrollRef} className="h-full w-full overflow-y-auto overscroll-contain bg-[#0D0D0D] text-[#F6EEE1] [background-image:radial-gradient(ellipse_at_50%_0%,#211912_0%,transparent_65%)]">
      <div className="mx-auto max-w-[1260px] px-4 pb-32 pt-3 sm:px-7 lg:px-10 lg:pb-12 lg:pt-6">
        <div className="flex items-center justify-between gap-3 border-b border-[#3b3024] pb-3">
          <button type="button" onClick={onClose} aria-label="Fermer le configurateur" className="min-h-11 shrink-0 rounded-xl px-2 text-sm font-semibold text-[#E8C078] hover:bg-[#31251b] focus-visible:outline-2 focus-visible:outline-[#E8C078]">
            <span aria-hidden="true">← </span>{returnLabel}
          </button>
          <span id={titleId} className="rounded-full border border-[#6d5132] bg-[#272016] px-3 py-1.5 text-right text-[10px] font-bold uppercase tracking-[.12em] text-[#EBD0A1] sm:text-xs">{title}</span>
        </div>

        <header className={`max-w-2xl py-4 sm:py-8 ${compact ? "hidden lg:block" : ""}`}>
          <h2 className="text-[clamp(2.1rem,5.6vw,4.15rem)] font-extrabold leading-[1.03] tracking-[-.055em]">Votre pizza,<br /> <span className="text-[#E8C078]">vos envies.</span></h2>
          <p className="mt-3 max-w-[57ch] text-sm leading-relaxed text-[#C8BDAE]">{description}</p>
        </header>

        <div className={`grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(310px,0.86fr)_minmax(0,1.14fr)] lg:gap-7 ${compact ? "mt-3 lg:mt-0" : ""}`}>
          <aside className={`relative min-w-0 overflow-hidden rounded-[24px] border border-[#60492e] bg-[#211811] px-4 py-4 shadow-[0_20px_45px_#0005] [background-image:radial-gradient(ellipse_at_50%_35%,#52371d80_0%,#251b13_63%,#19130f_100%)] sm:p-6 lg:sticky lg:top-4 ${compact ? "flex items-center gap-3 max-lg:py-2 lg:block" : ""}`} aria-label="Aperçu de votre pizza">
            <div className={compact ? "w-[76px] shrink-0 sm:w-[112px] lg:mx-auto lg:w-auto lg:max-w-[370px]" : "mx-auto max-w-[184px] sm:max-w-[320px] lg:max-w-[370px]"}>{preview}</div>
            <div className={`flex min-w-0 items-end justify-between gap-3 ${compact ? "flex-1 max-lg:items-center lg:mt-4 lg:border-t lg:border-[#6a5134]/60 lg:pt-3" : "mt-4 border-t border-[#6a5134]/60 pt-3"}`}>
              <div className="min-w-0">
                <h3 className={`break-words font-bold leading-tight ${compact ? "text-base sm:text-lg lg:text-[23px]" : "text-lg sm:text-[23px]"}`}>{previewTitle}</h3>
                {previewDetails && <div className="mt-1.5 text-xs leading-relaxed text-[#D7C0A2]">{previewDetails}</div>}
              </div>
              <span className="shrink-0 whitespace-nowrap text-lg font-bold text-[#E8C078] sm:text-2xl">{formatPrice(unitPriceCents)}&nbsp;€</span>
            </div>
          </aside>

          <section className="min-w-0 rounded-[24px] border border-[#45362a] bg-[#171411] shadow-[0_20px_45px_#0004]" aria-label="Personnalisation de votre pizza">
            <nav className="border-b border-[#3c3127] px-4 py-4 sm:px-6" aria-label="Étapes de personnalisation">
              <ol className="flex min-w-0 items-center gap-2 sm:gap-4">
                {steps.map((step, index) => (
                  <li key={step} aria-current={index === activeStep ? "step" : undefined} className="flex min-w-0 grow items-center gap-2 last:grow-0">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${index === activeStep ? "border-[#B5874A] bg-[#322719] text-[#F0CF9C]" : "border-[#504337] bg-[#241E19] text-[#BAADA0]"}`} aria-hidden="true">{index < activeStep ? "✓" : index + 1}</span>
                    <span className={`text-[11px] font-semibold sm:text-[13px] ${index === activeStep ? "text-[#F4DEC0]" : "text-[#BDB1A4]"}`}>{step}</span>
                    {index + 1 < steps.length && <span aria-hidden="true" className="min-w-1 flex-1 border-t border-[#514131]" />}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="min-w-0 px-4 py-5 sm:p-6 lg:p-8">{children}</div>
            <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-[#574231] bg-[#1a1511] px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 lg:sticky lg:rounded-b-[24px] lg:px-6 lg:py-4">
              {warning && <p role="status" className="mb-2 text-sm text-[#F4B6A2]">{warning}</p>}
              <div className="flex items-center justify-between gap-3">
                <div className="shrink-0">
                  <span className="block text-xs text-[#CBBBA8]">Total</span>
                  <span className="whitespace-nowrap text-[21px] font-extrabold leading-tight text-[#F6E0BF]" aria-live="polite">{formatPrice(totalCents)}&nbsp;€</span>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
                  {onBack && <button type="button" onClick={onBack} className="min-h-11 rounded-xl px-2 text-xs font-semibold text-[#E6CFAC] hover:bg-[#32271c] focus-visible:outline-2 focus-visible:outline-[#E8C078] sm:px-3 sm:text-sm">Retour</button>}
                  <button data-testid={actionTestId} type="button" onClick={onAction} disabled={actionDisabled} className="min-h-11 rounded-xl bg-[#E8C078] px-3.5 py-2 text-center text-xs font-extrabold text-[#21150a] hover:bg-[#F2D49D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8C078] disabled:cursor-not-allowed disabled:opacity-45 sm:px-5 sm:text-sm">
                    {actionLabel}
                  </button>
                </div>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
