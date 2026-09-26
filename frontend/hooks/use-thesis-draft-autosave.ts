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
  const [showBanner, setShowBanner] = useState(false);
  const inProgress = useThesisDraftStore((s) => s.inProgress);
  const save = useThesisDraftStore((s) => s.save);
  const clear = useThesisDraftStore((s) => s.clear);

  useEffect(() => {
    if (!isEditing && inProgress && Object.keys(inProgress).length > 0) {
      // Legitimate exception, not an oversight: Zustand's persist
      // middleware hydrates from localStorage asynchronously, after
      // what the lint rule's own guidance says an effect is for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBanner(true);
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
    if (inProgress) reset(inProgress as ThesisFormValues);
    setShowBanner(false);
  }

  function dismiss() {
    clear();
    setShowBanner(false);
  }

  return { showBanner, restore, dismiss, clear };
}
