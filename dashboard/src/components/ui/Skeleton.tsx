'use client';

import React from 'react';
import clsx from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = 20,
  rounded = 'md',
  className,
  ...props
}) => {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={clsx(
        'bg-slate-200 dark:bg-slate-800 animate-shimmer bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 bg-[length:1000px_100%]',
        roundedClasses[rounded],
        className
      )}
      style={style}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';

export { Skeleton, type SkeletonProps };
