'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { KeyRound, CreditCard, Users, LogOut, User, Copy, Check } from 'lucide-react';
import { clearAuthToken } from '@/lib/api';
import { getCurrentUser, type CurrentUser } from '@/lib/currentUser';

/**
 * Top-right user menu. Replaces the non-functional gear icon.
 * Reads the current user from the JWT (display-only) and offers Profile,
 * API Keys, Billing, Teams, Sign out.
 */
export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const displayName = user?.email ?? user?.wallet ?? 'Operator';
  const initials = (() => {
    if (user?.email) return user.email[0].toUpperCase();
    if (user?.wallet) return user.wallet.slice(2, 4).toUpperCase();
    return 'NO';
  })();
  const secondary = user?.wallet
    ? `${user.wallet.slice(0, 6)}…${user.wallet.slice(-4)}`
    : user?.tenant
    ? `tenant ${user.tenant.slice(0, 8)}`
    : 'guest session';

  const copyAddress = async () => {
    if (!user?.wallet) return;
    await navigator.clipboard.writeText(user.wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const signOut = () => {
    clearAuthToken();
    router.push('/auth');
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors outline-none focus:ring-2 focus:ring-brand-400"
          aria-label="Open user menu"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[240px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1.5 text-sm outline-none"
        >
          {/* Header */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium truncate">
              <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span className="truncate" title={displayName}>{displayName}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span className="truncate">{secondary}</span>
              {user?.wallet && (
                <button
                  onClick={copyAddress}
                  className="ml-auto text-slate-400 hover:text-brand-600 transition-colors"
                  aria-label="Copy wallet address"
                >
                  {copied ? <Check className="w-3 h-3 text-success-500" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/api-keys"
              className="flex items-center gap-2 px-3 py-2 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <KeyRound className="w-4 h-4 text-slate-500" />
              API Keys
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-2 px-3 py-2 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <CreditCard className="w-4 h-4 text-slate-500" />
              Billing
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/teams"
              className="flex items-center gap-2 px-3 py-2 outline-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <Users className="w-4 h-4 text-slate-500" />
              Teams
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

          <DropdownMenu.Item
            onSelect={signOut}
            className="flex items-center gap-2 px-3 py-2 outline-none cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
