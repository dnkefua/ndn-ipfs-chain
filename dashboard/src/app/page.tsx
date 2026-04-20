'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  Zap,
  Globe2,
  Cpu,
  Lock,
  GitBranch,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Globe2,
    title: 'Multi-region, multi-cloud',
    body: 'Pin to 9 regions across 3 clouds with sovereignty controls — EU data stays in EU, always.',
  },
  {
    icon: Cpu,
    title: 'HuggingFace model registry',
    body: 'Mirror any HF model to IPFS in one click. Content-addressed AI weights, ready for your inference stack.',
  },
  {
    icon: Lock,
    title: 'Crypto-shredding',
    body: 'Envelope-encrypt at rest. Delete keys on-chain to prove GDPR erasure without re-pinning a petabyte.',
  },
  {
    icon: Zap,
    title: 'Smart-contract triggers',
    body: 'Pin on-chain events across Ethereum, Polygon, Arbitrum, Base, Optimism, and Solana.',
  },
  {
    icon: GitBranch,
    title: 'Filecoin-backed deals',
    body: 'Verified deals, automatic renewal, piece-CID tracking. Storage that outlives your company.',
  },
  {
    icon: BarChart3,
    title: 'Real usage metering',
    body: 'GB-hours, egress, request counts — rolled up hourly, billed transparently, exportable on demand.',
  },
];

const LOGOS = ['Ethereum', 'Polygon', 'Filecoin', 'HuggingFace', 'Solana', 'Base', 'Arbitrum'];

const COMPARE = [
  { feat: 'HuggingFace model mirroring',     ndn: true,  pinata: false, web3: false, filebase: false },
  { feat: 'Crypto-shred anchored on-chain',  ndn: true,  pinata: false, web3: false, filebase: false },
  { feat: 'Smart-contract event triggers',   ndn: true,  pinata: false, web3: false, filebase: false },
  { feat: 'Multi-region sovereignty',        ndn: true,  pinata: false, web3: 'limited', filebase: true },
  { feat: 'Filecoin deals + verification',   ndn: true,  pinata: false, web3: true,  filebase: false },
  { feat: 'Enterprise SSO & audit log',      ndn: true,  pinata: 'soon', web3: false, filebase: true },
];

function Check({ v }: { v: true | false | string }) {
  if (v === true) return <CheckCircle2 className="w-5 h-5 text-success-500 mx-auto" />;
  if (v === false) return <span className="text-slate-400">—</span>;
  return <span className="text-xs font-medium text-warning-600">{v}</span>;
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 shadow-glow" />
            <span className="font-bold text-lg">NDN IPFS Chain</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600 dark:text-slate-400">
            <a href="#features" className="hover:text-brand-600 transition">Features</a>
            <a href="#compare" className="hover:text-brand-600 transition">Compare</a>
            <a href="/whitepaper/index.html" className="hover:text-brand-600 transition">Whitepaper</a>
            <a href="https://docs.ndnanalytics.com" className="hover:text-brand-600 transition">Docs</a>
            <a
              href="https://ndn-api-1037328355027.us-west1.run.app/docs"
              className="hover:text-brand-600 transition"
              target="_blank"
              rel="noreferrer"
            >
              API
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/dashboard" className="btn-primary text-sm">
              Open Console
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-xs font-medium mb-8">
            <Shield className="w-3.5 h-3.5" />
            SOC 2 in progress · IPFS Foundation grant applicant
          </div>
          <h1 className="font-bold tracking-tight text-5xl md:text-7xl leading-[1.05] mb-6">
            Enterprise IPFS,<br />
            <span className="bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500 bg-clip-text text-transparent">
              built for the AI era
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10">
            Pin petabytes. Mirror HuggingFace models. Anchor crypto-shredding on-chain.
            All the primitives Pinata forgot — and Web3.Storage left behind.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
              Launch the console
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://ndn-api-1037328355027.us-west1.run.app/docs"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-base px-6 py-3"
            >
              Read the API docs
            </a>
          </div>

          {/* Logo bar */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium text-slate-500 dark:text-slate-500">
            {LOGOS.map((l) => (
              <span key={l} className="opacity-70 hover:opacity-100 transition">{l}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Everything the old IPFS players don&apos;t have
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              We studied the pain points. Then we built the platform teams keep asking their
              existing pinning vendor to build.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="card card-hover group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="py-24 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Apples-to-apples
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Features that matter to serious teams. We picked the ones our competitors won&apos;t put in a table.
            </p>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left p-4 font-semibold">Capability</th>
                  <th className="p-4 font-semibold text-brand-600">NDN</th>
                  <th className="p-4 font-semibold text-slate-500">Pinata</th>
                  <th className="p-4 font-semibold text-slate-500">Web3.Storage</th>
                  <th className="p-4 font-semibold text-slate-500">Filebase</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.feat} className="border-b border-slate-100 dark:border-slate-900 last:border-0">
                    <td className="p-4 text-left font-medium">{row.feat}</td>
                    <td className="p-4 text-center"><Check v={row.ndn} /></td>
                    <td className="p-4 text-center"><Check v={row.pinata} /></td>
                    <td className="p-4 text-center"><Check v={row.web3} /></td>
                    <td className="p-4 text-center"><Check v={row.filebase} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Ship on IPFS without the babysitting
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
            Free tier: 5 GB, 3 replicas, all features. No credit card, no sales call. The console
            opens in under 10 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-base px-8 py-3 inline-flex">
              Open the console
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="/whitepaper/index.html" className="btn-secondary text-base px-8 py-3 inline-flex">
              Read the white paper
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-10 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>© 2026 NDN Analytics · built for the decentralised web</span>
          <div className="flex items-center gap-6">
            <a href="https://docs.ndnanalytics.com" className="hover:text-brand-600">Docs</a>
            <a href="mailto:support@ndnanalytics.com" className="hover:text-brand-600">Support</a>
            <a href="/dashboard" className="hover:text-brand-600">Console</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
