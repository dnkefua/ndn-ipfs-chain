'use client';

import React from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
    >
      {icon && <div className="text-5xl mb-6 opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

export { EmptyState, type EmptyStateProps };
