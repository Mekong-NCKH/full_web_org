import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { User } from '@/types';

type UserStore = {
  user: User | null;
  setUser: (user: User | null) => void;
  balance: number;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => {
        set(() => ({ user: user }));
      },
      isStudent: true,
      lastUpdatedDate: '',
      balance: 0,
    }),
    {
      name: 'userStore',
    },
  ),
);
