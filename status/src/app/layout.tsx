import type { Metadata } from 'next';
import '@/globals.css';

export const metadata: Metadata = {
  title: 'NDN IPFS Chain Status',
  description: 'System status and uptime monitoring for NDN IPFS infrastructure',
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
