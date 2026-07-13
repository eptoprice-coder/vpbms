'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUiStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: false,
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
    }),
    { name: 'vpbms_ui' }
  )
);
