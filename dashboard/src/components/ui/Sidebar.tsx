'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ChevronLeft, LogOut, Menu, X } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  items: SidebarItem[];
  currentPath: string;
  user?: {
    name: string;
    email: string;
  };
  onSignout?: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  items,
  currentPath,
  user,
  onSignout,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-600 to-brand-700" />
            <span className="font-bold text-slate-900 dark:text-slate-100">NDN</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors hidden lg:block"
        >
          <ChevronLeft
            className={clsx('w-5 h-5 transition-transform', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                  : 'text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User section */}
      {user && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
          {!collapsed && (
            <div className="text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
                {user.email}
              </p>
            </div>
          )}
          <button
            onClick={onSignout}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed bottom-6 right-6 lg:hidden p-3 bg-brand-600 text-white rounded-full shadow-floating hover:bg-brand-700 z-40"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex flex-col h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
          collapsed ? 'w-20' : 'w-64',
          className
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-800 shadow-floating">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

Sidebar.displayName = 'Sidebar';

export { Sidebar, type SidebarProps, type SidebarItem };
