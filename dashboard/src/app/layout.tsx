import type { Metadata } from 'next';
import '@/globals.css';

export const metadata: Metadata = {
  title: 'NDN IPFS Chain Dashboard',
  description: 'Enterprise IPFS pinning, lifecycle, and analytics platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
