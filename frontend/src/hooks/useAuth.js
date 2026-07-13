'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

// Guards a page: requires a valid session and (optionally) a specific role.
export function useRequireAuth(requiredRole) {
  const router = useRouter();
  const { token, user, clearAuth } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!token) {
        router.replace('/login');
        return;
      }
      try {
        await api.get('/auth/me');
        if (requiredRole && user?.role !== requiredRole) {
          router.replace(user?.role === 'super_admin' ? '/admin/dashboard' : '/vendor/dashboard');
          return;
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        clearAuth();
        router.replace('/login');
      }
    };
    check();
    return () => { cancelled = true; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, user };
}
