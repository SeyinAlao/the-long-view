interface RestoreDraftBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
}

export function RestoreDraftBanner({ onRestore, onDismiss }: RestoreDraftBannerProps) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4 rounded-md border border-brass/40 bg-brass/10 px-4 py-3">
      <p className="text-sm text-ink/80">Found an unsaved draft from last time.</p>
      <div className="flex shrink-0 gap-3 text-sm font-medium">
        <button type="button" onClick={onRestore} className="text-brass-dark hover:underline">
          Restore
        </button>
        <button type="button" onClick={onDismiss} className="text-muted hover:underline">
          Discard
        </button>
      </div>
    </div>
  );
}
