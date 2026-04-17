'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, required = false, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            {label}
            {required && <span className="text-danger-600 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            'textarea',
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

Textarea.displayName = 'Textarea';

export { Textarea, type TextareaProps };
