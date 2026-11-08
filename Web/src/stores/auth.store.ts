import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthStore = {
  isAuthenticated: boolean;
  token: string | null;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      setIsAuthenticated: (isAuthenticated) => {
        set(() => ({ isAuthenticated }));
      },
      setToken: (token) => {
        // when a token is set, mark authenticated; clearing token logs out
        if (token) {
          set(() => ({ token, isAuthenticated: true }));
        } else {
          set(() => ({ token: null, isAuthenticated: false }));
        }
      },
      logout: () => {
        set(() => ({ token: null, isAuthenticated: false }));
      },
    }),
    {
      name: 'authStore',
    },
  ),
);
