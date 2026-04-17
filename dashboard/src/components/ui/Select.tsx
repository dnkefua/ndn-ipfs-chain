'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, required = false, options = [], children, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            {label}
            {required && <span className="text-danger-600 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'select',
            error && 'focus:ring-danger-500 border-danger-300 dark:border-danger-700',
            className
          )}
          {...props}
        >
          {options.length > 0 ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          ) : (
            children
          )}
        </select>
        {error && <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select, type SelectProps };
