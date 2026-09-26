import { cn } from '@/lib/utils';

// A plain CSS pulse, not a Framer Motion loop — a loading placeholder
// should never compete for attention or need to respect
// prefers-reduced-motion logic; a gentle opacity pulse via Tailwind's
// built-in animate-pulse is the right amount of motion for "something
// is coming," nothing more.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-ink/10', className)} />;
}
