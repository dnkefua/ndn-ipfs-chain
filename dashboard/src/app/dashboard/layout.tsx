'use client';

import { usePathname } from 'next/navigation';
import {
  Pin,
  Sparkles,
  Repeat,
  Zap,
  Users,
  KeyRound,
  LineChart,
  CreditCard,
  Activity,
} from 'lucide-react';
import { Sidebar, TopBar, ToastProvider } from '@/components/ui';

const NAV_ITEMS = [
  { href: '/dashboard',            label: 'Pins',      icon: Pin },
  { href: '/dashboard/models',     label: 'AI Models', icon: Sparkles },
  { href: '/dashboard/lifecycle',  label: 'Lifecycle', icon: Repeat },
  { href: '/dashboard/triggers',   label: 'Triggers',  icon: Zap },
  { href: '/dashboard/teams',      label: 'Teams',     icon: Users },
  { href: '/dashboard/api-keys',   label: 'API Keys',  icon: KeyRound },
  { href: '/dashboard/analytics',  label: 'Analytics', icon: LineChart },
  { href: '/dashboard/billing',    label: 'Billing',   icon: CreditCard },
  { href: '/dashboard/status',     label: 'Status',    icon: Activity },
];

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
      </div>
    </ToastProvider>
  );
}
