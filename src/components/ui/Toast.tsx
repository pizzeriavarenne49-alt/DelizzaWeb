"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/contexts/ToastContext";

export default function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-20 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="rounded-[14px] bg-[#1A1A1A] border border-[#D4A053]/20 px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)] text-[14px] font-medium text-[#F5F5F5]"
            role="status"
          >
            <span className="text-[#D4A053]">✓</span>{" "}
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
