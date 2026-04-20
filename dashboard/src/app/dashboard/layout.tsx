'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  HardDrive,
  Sparkles,
  Repeat,
  Zap,
  Users,
  KeyRound,
  LineChart,
  CreditCard,
  Activity,
  Database,
  FileJson,
  Eye,
  BookOpen,
} from 'lucide-react';
import { Sidebar, TopBar, ToastProvider } from '@/components/ui';
import { AIAssistant } from '@/components/ui/AIAssistant';
import { api } from '@/lib/api';

const NAV_ITEMS = [
  // Data plane
  { href: '/dashboard',                 label: 'Blobs',    icon: HardDrive,  section: 'Data' },
  { href: '/dashboard/models',          label: 'Models',   icon: Sparkles },
  { href: '/dashboard/records',         label: 'Records',  icon: Database },
  { href: '/dashboard/records/schemas', label: 'Schemas',  icon: FileJson },
  { href: '/dashboard/records/views',   label: 'Views',    icon: Eye },
  // Platform
  { href: '/dashboard/lifecycle',       label: 'Lifecycle',  icon: Repeat,    section: 'Platform' },
  { href: '/dashboard/triggers',        label: 'Triggers',   icon: Zap },
  { href: '/dashboard/analytics',       label: 'Analytics',  icon: LineChart },
  { href: '/dashboard/status',          label: 'Status',     icon: Activity },
  // Account
  { href: '/dashboard/teams',           label: 'Teams',    icon: Users,      section: 'Account' },
  { href: '/dashboard/api-keys',        label: 'API Keys', icon: KeyRound },
  { href: '/dashboard/billing',         label: 'Billing',  icon: CreditCard },
  // Docs
  { href: '/dashboard/docs',            label: 'Docs',       icon: BookOpen,   section: 'Docs' },
  { href: '/whitepaper/',               label: 'Whitepaper', icon: FileJson }, // Reusing FileJson or adding another

];

interface DiscoveryInfo {
  ndp_version?: string;
  databases?: { blobs?: boolean; models?: boolean; structured?: boolean };
  provider?: string;
}

function DiscoveryPill() {
  const [info, setInfo] = useState<DiscoveryInfo | null>(null);

  useEffect(() => {
    api.discovery
      .get()
      .then((data: DiscoveryInfo) => setInfo(data))
      .catch(() => {});
  }, []);

  if (!info) return null;

  const db = info.databases ?? {};
  const version = info.ndp_version ?? '1.0';

  return (
    <div
      className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-600 dark:text-slate-400 cursor-default"
      title={`Blobs · Models · Structured — NDP v${version} discovery${info.provider ? ` · ${info.provider}` : ''}`}
    >
      <span>NDP {version}</span>
      <span className="text-slate-400 dark:text-slate-600">·</span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${db.blobs ? 'bg-success-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        title="Blobs"
      />
      <span
        className={`w-1.5 h-1.5 rounded-full ${db.models ? 'bg-success-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        title="Models"
      />
      <span
        className={`w-1.5 h-1.5 rounded-full ${db.structured ? 'bg-success-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        title="Structured"
      />
    </div>
  );
}

function toBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((seg, i) => {
    const label =
      seg === 'dashboard'
        ? 'Dashboard'
        : seg
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    return {
      label,
      href: '/' + segments.slice(0, i + 1).join('/'),
    };
  });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const crumbs = toBreadcrumbs(pathname);

  // Demo user — swap for real user from auth context in production
  const user = { name: 'NDN Operator', email: 'operator@ndnanalytics.com' };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
        <Sidebar
          items={NAV_ITEMS}
          currentPath={pathname}
          user={user}
          onSignout={() => {
            // Clear cookie and redirect — production should go through /auth
            if (typeof document !== 'undefined') {
              document.cookie = 'jwt=; Max-Age=0; path=/';
              window.location.href = '/auth';
            }
          }}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            breadcrumbs={crumbs}
            user={{ name: user.name, initials: 'NO' }}
            notificationCount={0}
            extraRight={<DiscoveryPill />}
          />

          <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10 max-w-[1440px] w-full mx-auto">
            {children}
          </main>

          <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-500 flex items-center justify-between">
            <span>NDN IPFS Chain · Enterprise Edition</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              API Connected
            </span>
          </footer>
        </div>

        {/* Floating AI assistant — available on every dashboard page */}
        <AIAssistant />
      </div>
    </ToastProvider>
  );
}
