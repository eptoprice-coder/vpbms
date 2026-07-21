import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'VPBMS | Vendor Price Broadcast Management',
  description: 'Manage daily prices and broadcast price lists to customers via WhatsApp.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </body>
    </html>
  );
}
