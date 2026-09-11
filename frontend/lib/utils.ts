// Minimal class-name joiner. Deliberately not pulling in clsx +
// tailwind-merge for a Phase 0 scaffold with no conditional class
// conflicts yet — add them when a real component actually needs
// conflict-resolution, not preemptively.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
