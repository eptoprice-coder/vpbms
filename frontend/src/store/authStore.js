'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      vendor: null,
      setAuth: ({ token, user, vendor }) => set({ token, user, vendor }),
      clearAuth: () => set({ token: null, user: null, vendor: null }),
    }),
    {
      name: 'vpbms_auth',
      partialize: (state) => ({ token: state.token, user: state.user, vendor: state.vendor }),
    }
  )
);
