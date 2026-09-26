import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThesisDraftStore {
  inProgress: Record<string, unknown> | null;
  save: (values: Record<string, unknown>) => void;
  clear: () => void;
}

export const useThesisDraftStore = create<ThesisDraftStore>()(
  persist(
    (set) => ({
      inProgress: null,
      save: (values) => set({ inProgress: values }),
      clear: () => set({ inProgress: null }),
    }),
    { name: 'thesis-draft-in-progress' },
  ),
);
