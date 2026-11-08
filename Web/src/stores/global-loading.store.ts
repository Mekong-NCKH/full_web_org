import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type GlobalLoadingStore = {
  globalLoading: boolean;
  setGlobalLoading: (globalLoading: boolean) => void;
};

export const useGlobalLoadingStore = create<GlobalLoadingStore>()(
  persist(
    (set) => ({
      globalLoading: false,
      setGlobalLoading: (globalLoading) => {
        set(() => ({ globalLoading: globalLoading }));
      },
    }),
    {
      name: 'globalLoadingStore',
    },
  ),
);
