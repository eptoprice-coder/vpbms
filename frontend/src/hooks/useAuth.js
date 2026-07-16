'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

// Guards a page: requires a valid session and (optionally) a specific role.
//
// Two hard-won rules live here:
// 1. NEVER decide "not logged in" before the persisted store has rehydrated.
//    When the PWA resumes from the background the page remounts, and for a
//    moment the store is empty — redirecting then logs users out for no reason.
// 2. Only treat a REAL 401/403 from the server as "session over". Network
//    failures (offline, app resume, flaky mobile data) keep the cached session.
export function useRequireAuth(requiredRole) {
  const router = useRouter();
  const { token, user, clearAuth } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(
    // zustand/persist: may already be hydrated on client navigation
    typeof window !== 'undefined' && useAuthStore.persist?.hasHydrated?.()
  );

  useEffect(() => {
    if (hydrated) return;
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => setHydrated(true));
    // Safety net in case hydration finished between render and subscribe
    if (useAuthStore.persist?.hasHydrated?.()) setHydrated(true);
    return () => unsub?.();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    const check = async () => {
      // Fall back to the raw token in localStorage — it survives even if the
      // store copy is momentarily missing.
      const effectiveToken = token || (typeof window !== 'undefined' && localStorage.getItem('vpbms_token'));
      if (!effectiveToken) {
        router.replace('/login');
        return;
      }
      if (requiredRole && user?.role && user.role !== requiredRole) {
        router.replace(user.role === 'super_admin' ? '/admin/dashboard' : '/vendor/dashboard');
        return;
      }
      // Show the page immediately from the cached session; verify in background.
      if (!cancelled) setReady(true);
      try {
        await api.get('/auth/me');
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          clearAuth();
          router.replace('/login');
        }
        // No response (offline / app resume) → keep the session, do nothing.
      }
    };
    check();
    return () => { cancelled = true; };
  }, [hydrated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, user };
}
