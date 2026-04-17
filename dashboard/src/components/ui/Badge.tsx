'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { Circle } from 'lucide-react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', dot = false, children, ...props }, ref) => {
    const variantClasses = {
      success: 'badge-success',
      warning: 'badge-warning',
      danger: 'badge-danger',
      info: 'badge-info',
      neutral: 'badge-neutral',
      brand: 'badge-brand',
    };

    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
    };

    return (
      <div
        ref={ref}
        className={clsx('badge', variantClasses[variant], sizeClasses[size], className)}
        {...props}
      >
        {dot && <Circle className="w-1.5 h-1.5 fill-current" />}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, type BadgeProps };
