import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — NDN IPFS Chain',
  description:
    'Sign in or create an account for NDN IPFS Chain. Email/password and Ethereum wallet (SIWE) authentication.',
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
