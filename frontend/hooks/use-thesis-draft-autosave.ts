'use client';

import { useEffect, useState } from 'react';
import type { UseFormReset, UseFormWatch } from 'react-hook-form';
import { useThesisDraftStore } from '@/stores/thesis-draft-store';
import type { ThesisFormValues } from '@/lib/thesis-schema';

interface UseThesisDraftAutosaveArgs {
  watch: UseFormWatch<ThesisFormValues>;
  reset: UseFormReset<ThesisFormValues>;
  isEditing: boolean;
}

export function useThesisDraftAutosave({ watch, reset, isEditing }: UseThesisDraftAutosaveArgs) {
  // The unsaved draft left from last time, captured once on mount, so
  // Restore brings back that writing even after new typing has been
  // autosaved over it.
  const [found, setFound] = useState<Record<string, unknown> | null>(null);
  const save = useThesisDraftStore((s) => s.save);
  const clear = useThesisDraftStore((s) => s.clear);

  useEffect(() => {
    // Read the store directly, not through the hook: during hydration
    // Zustand's hook returns the store's *initial* state (null) so the
    // first render matches the server's, and this once-only check would
    // never see the saved draft. By the time an effect runs, the store
    // has read localStorage.
    const stored = useThesisDraftStore.getState().inProgress;
    if (!isEditing && stored && Object.keys(stored).length > 0) {
      // Legitimate exception, not an oversight: localStorage is only
      // readable in the browser, after mount - what an effect is for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFound(stored);
    }
    // Only ever check once, right when the form mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEditing) return;
    let timer: ReturnType<typeof setTimeout>;
    const subscription = watch((values) => {
      clearTimeout(timer);
      timer = setTimeout(() => save(values), 800);
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [watch, isEditing, save]);

  function restore() {
    if (found) reset(found as ThesisFormValues);
    setFound(null);
  }

  function dismiss() {
    clear();
    setFound(null);
  }

  return { showBanner: found !== null, restore, dismiss, clear };
}
