import { formatDate } from '@/lib/format-date';

// What an author is told about a thesis the operator has removed: the
// date, and nothing else. The reason is never sent to the browser.
export function RemovedNotice({ hiddenAt }: { hiddenAt: string }) {
  return (
    <p className="mt-1 text-sm text-ink/80">Removed by the operator on {formatDate(hiddenAt)}.</p>
  );
}
