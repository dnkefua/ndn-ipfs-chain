'use client';

import React from 'react';
import clsx from 'clsx';
import { Bell, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserMenu } from './UserMenu';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface TopBarProps {
  breadcrumbs?: Breadcrumb[];
  user?: {
    name: string;
    initials: string;
  };
  onNotificationClick?: () => void;
  onUserClick?: () => void;
  notificationCount?: number;
  className?: string;
  extraRight?: React.ReactNode;
}

const TopBar: React.FC<TopBarProps> = ({
  breadcrumbs,
  user,
  onNotificationClick,
  onUserClick,
  notificationCount = 0,
  className,
  extraRight,
}) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  return (
    <header
      className={clsx(
        'sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800',
        className
      )}
    >
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            {breadcrumbs.map((crumb, index) => (
              <div key={index}>
                {index > 0 && <span className="mx-1">/</span>}
                <span>{crumb.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-4 ml-auto">
          {extraRight}
          {/* Search placeholder */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-500 dark:text-slate-400">
            <span>⌘ K</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>

          {/* Notifications */}
          <button
            onClick={onNotificationClick}
            className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger-600 rounded-full" />
            )}
          </button>

          {/* User menu — reads current user from JWT, handles sign out */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

TopBar.displayName = 'TopBar';

export { TopBar, type TopBarProps };
