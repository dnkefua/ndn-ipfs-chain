'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface Tab {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  tabs: Tab[];
  className?: string;
  children?: React.ReactNode;
}

const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onValueChange, tabs, className, children }, ref) => (
    <div ref={ref} className={className}>
      <div className="flex gap-0 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            className={clsx(
              'px-4 py-3 text-sm font-medium transition-colors relative',
              value === tab.value
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300',
              'flex items-center gap-2'
            )}
          >
            {tab.icon && <span className="inline-flex">{tab.icon}</span>}
            {tab.label}
            {value === tab.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 dark:bg-brand-400" />
            )}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
);

Tabs.displayName = 'Tabs';

export { Tabs, type TabsProps, type Tab };
