'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Pins', icon: '📌' },
    { href: '/dashboard/models', label: 'Models', icon: '🤖' },
    { href: '/dashboard/lifecycle', label: 'Lifecycle', icon: '🔄' },
    { href: '/dashboard/triggers', label: 'Triggers', icon: '⚡' },
    { href: '/dashboard/teams', label: 'Teams', icon: '👥' },
    { href: '/dashboard/api-keys', label: 'API Keys', icon: '🔑' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: '📊' },
    { href: '/dashboard/billing', label: 'Billing', icon: '💳' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-brand-600">NDN IPFS Chain</h1>
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    pathname === item.href
                      ? 'bg-brand-100 text-brand-600 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Demo Mode</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
