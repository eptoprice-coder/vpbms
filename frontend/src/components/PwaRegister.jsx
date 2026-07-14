'use client';
import { useEffect } from 'react';

// Registers the service worker so the app installs and works offline as a PWA.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // avoid SW cache during development
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
