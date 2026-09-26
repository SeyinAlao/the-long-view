'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

interface ThesisSubmittedViewProps {
  variant: 'draft' | 'published';
}

export function ThesisSubmittedView({ variant }: ThesisSubmittedViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const isPublished = variant === 'published';

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0.01 } : { type: 'spring', damping: 22, stiffness: 260 }}
      className="mx-auto max-w-md px-5 py-24 text-center"
    >
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">
        {isPublished ? 'Published' : 'Saved as a private draft'}
      </p>
      <h1 className="font-display mt-2 text-3xl">
        {isPublished ? 'Locked. The record is keeping time.' : 'Still yours to shape.'}
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/80">
        {isPublished
          ? "This thesis can't be edited from here on — that's the whole point."
          : 'Drafts stay private until you publish. You can come back and finish this one anytime.'}
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-opacity hover:opacity-90"
      >
        Back to your desk
      </Link>
    </motion.div>
  );
}
