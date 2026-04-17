'use client';

import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className }) => {
  return (
    <div
      className={clsx(
        'rounded-full border-brand-200 dark:border-brand-800 border-t-brand-600 dark:border-t-brand-400 animate-spin',
        sizeClasses[size],
        className
      )}
    />
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';

export { LoadingSpinner, type LoadingSpinnerProps };
