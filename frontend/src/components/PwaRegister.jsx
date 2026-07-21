'use client';
import { useEffect } from 'react';

// Registers the service worker so the app installs and works offline as a PWA.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // avoid SW cache during development

    navigator.serviceWorker.register('/sw.js').catch(() => {});

    // When a new service worker takes over (right after a fresh deploy), reload
    // once so the page is never left silently running a stale, mismatched JS
    // bundle from before the deploy.
    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);
  return null;
}
