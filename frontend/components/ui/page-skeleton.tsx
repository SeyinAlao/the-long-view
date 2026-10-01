import { Skeleton } from './skeleton';

const times = (n: number) => Array.from({ length: n }, (_, i) => i);

function Cards() {
  return (
    <div className="mt-10 space-y-8">
      {times(3).map((i) => (
        <div key={i} className="space-y-3 border-b border-ink/10 pb-8">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-56" />
        </div>
      ))}
    </div>
  );
}

function Table() {
  return (
    <>
      <Skeleton className="mt-5 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
      <div className="mt-10 space-y-5">
        {times(5).map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-7 w-7" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

function Detail() {
  return (
    <>
      <Skeleton className="mt-8 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
      <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {times(4).map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </>
  );
}

function Desk() {
  return <Skeleton className="mt-5 h-4 w-64" />;
}

function Form() {
  return (
    <div className="mt-10 space-y-8">
      {times(3).map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-36 rounded-full" />
    </div>
  );
}

function Rows() {
  return (
    <div className="mt-8 space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
      {times(3).map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

const SHAPES = { cards: Cards, table: Table, detail: Detail, desk: Desk, form: Form, rows: Rows };

export function PageSkeleton({ variant }: { variant: keyof typeof SHAPES }) {
  const Shape = SHAPES[variant];
  return (
    <main aria-busy="true" className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-9 w-3/4" />
      <Shape />
      <p role="status" className="sr-only">
        Loading…
      </p>
      {/* Hidden by CSS for the first 8 seconds (see .slow-load-notice in
          globals.css), so most loads finish before anyone sees it. */}
      <p aria-hidden="true" className="slow-load-notice mt-8 text-sm text-muted">
        Still loading — this can take up to a minute.
      </p>
    </main>
  );
}
