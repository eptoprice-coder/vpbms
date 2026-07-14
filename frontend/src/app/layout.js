import './globals.css';
import { Toaster } from 'react-hot-toast';
import PwaRegister from '@/components/PwaRegister';

export const metadata = {
  title: 'Eptomart Partner Hub',
  description: 'Your daily price studio — update prices and broadcast lists to customers via WhatsApp.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Partner Hub',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#050914',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <PwaRegister />
      </body>
    </html>
  );
}
