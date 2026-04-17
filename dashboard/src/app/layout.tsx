import type { Metadata } from 'next';
import '@/globals.css';

export const metadata: Metadata = {
  title: 'NDN IPFS Chain — Enterprise IPFS Pinning & AI Model Registry',
  description:
    'The IPFS platform built for the AI era. Enterprise-grade pinning, lifecycle automation, crypto-shredding, and HuggingFace model mirroring — in every region.',
  metadataBase: new URL('https://ndnanalytics.com'),
  openGraph: {
    title: 'NDN IPFS Chain',
    description:
      'Enterprise IPFS pinning + AI model registry. Multi-region, Filecoin-backed, GDPR-ready.',
    type: 'website',
  },
};

// Inline script to apply the stored theme before React hydrates — prevents a flash of
// the wrong colour scheme when a user has dark mode enabled.
const themeBootstrap = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch(_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
