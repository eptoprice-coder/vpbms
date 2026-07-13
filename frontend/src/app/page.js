'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return router.replace('/login');
    if (user.role === 'super_admin') return router.replace('/admin/dashboard');
    router.replace('/vendor/dashboard');
  }, [user, router]);

  return null;
}
