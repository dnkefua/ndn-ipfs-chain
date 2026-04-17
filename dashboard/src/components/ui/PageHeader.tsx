'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}) => {
  return (
    <div className={clsx('space-y-4 mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-900 dark:text-slate-100 font-medium">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {description && (
            <p className="text-slate-600 dark:text-slate-400 mt-2">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
};

PageHeader.displayName = 'PageHeader';

export { PageHeader, type PageHeaderProps, type Breadcrumb };
