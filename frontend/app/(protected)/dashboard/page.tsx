export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10 sm:px-8 sm:py-16">
      <p className="text-[11px] uppercase tracking-[0.1em] text-muted">Protected route</p>
      <h1 className="font-display mt-2 text-3xl">Dashboard placeholder</h1>
      <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink/90">
        This route lives under the (protected) group so the real auth check added in
        Phase 1 applies to it automatically. Nothing here is wired to real data yet.
      </p>
    </main>
  );
}
