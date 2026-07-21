'use client';
import { useEffect } from 'react';

// Registers the service worker so the app installs and works offline as a PWA.
// Deliberately does NOT force a reload on controller change — the service worker
// (see /public/sw.js) is network-first for everything, so normal navigation always
// gets fresh code anyway. A forced reload here can fire mid-session (e.g. right
// after logging in, on a first visit or right after clearing site data), which
// looks exactly like being logged out for no reason.
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // avoid SW cache during development
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
