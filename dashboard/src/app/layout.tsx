import type { Metadata } from 'next';
import '@/globals.css';

const title = 'NDN IPFS Chain — Enterprise IPFS Pinning & AI Model Registry';
const description =
  'The IPFS platform built for the AI era. Enterprise-grade pinning, lifecycle automation, crypto-shredding, and HuggingFace model mirroring — in every region.';
const ogImage = 'https://ndnanalytics.com/og-image.png';

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL('https://ndnanalytics.com'),
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
  },
  openGraph: {
    title: 'NDN IPFS Chain — Enterprise IPFS Storage',
    description,
    url: 'https://ndnanalytics.com',
    siteName: 'NDN IPFS Chain',
    type: 'website',
    locale: 'en_US',
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'NDN IPFS Chain' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NDN IPFS Chain — Enterprise IPFS Storage',
    description,
    images: [ogImage],
  },
  referrer: 'origin-when-cross-origin',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  name: 'NDN IPFS Chain',
                  url: 'https://ndnanalytics.com',
                  description:
                    'Enterprise IPFS pinning platform with multi-region support, HuggingFace model mirroring, crypto-shredding, and smart-contract triggers.',
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'Web',
                },
                {
                  '@type': 'Organization',
                  name: 'NDN Analytics',
                  url: 'https://ndnanalytics.com',
                  description:
                    'Enterprise IPFS infrastructure provider. Multi-region pinning, Filecoin-backed deals, and AI model registry services.',
                  foundingDate: '2025',
                },
              ],
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
