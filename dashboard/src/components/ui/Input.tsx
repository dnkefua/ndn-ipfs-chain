'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, required = false, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            {label}
            {required && <span className="text-danger-600 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'input',
            error && 'focus:ring-danger-500 border-danger-300 dark:border-danger-700',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, type InputProps };
