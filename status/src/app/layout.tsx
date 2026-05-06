import type { Metadata } from 'next';
import '@/globals.css';

export const metadata: Metadata = {
  title: 'NDN IPFS Chain Status',
  description: 'System status and uptime monitoring for NDN IPFS infrastructure',
  metadataBase: new URL('https://status.ndnipfs.link'),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'NDN IPFS Chain Status',
    description: 'Real-time system status and uptime monitoring for NDN IPFS Chain infrastructure across all regions.',
    url: 'https://status.ndnipfs.link',
    siteName: 'NDN IPFS Chain',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NDN IPFS Chain Status',
    description: 'Real-time system status and uptime monitoring for NDN IPFS Chain infrastructure across all regions.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50">
          {children}
        </div>
      </body>
    </html>
  );
}
