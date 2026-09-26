'use client';

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface CollapsibleSectionProps {
  label: string;
  children: ReactNode;
}

// Generic on purpose — this is "content behind an explicit optional
// toggle," which is a real pattern, not a one-off. The thesis form is
// its first use, not its only intended one.
export function CollapsibleSection({ label, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      {!open && (
        <motion.button
          type="button"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-ink/25 px-5 py-3 text-sm font-medium text-ink/70 transition-colors hover:border-brass hover:text-ink"
        >
          <i className="bx bx-plus text-base" aria-hidden="true" />
          {label}
        </motion.button>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={
              shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 28, stiffness: 300 }
            }
            className="space-y-8 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
