import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  // Decorative: screen readers get the page's loading announcement instead.
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-ink/10', className)} />;
}
