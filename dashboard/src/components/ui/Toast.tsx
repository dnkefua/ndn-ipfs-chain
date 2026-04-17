'use client';

import React from 'react';
import clsx from 'clsx';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  onClose: (id: string) => void;
}

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />,
  error: <AlertCircle className="w-5 h-5 text-danger-600 dark:text-danger-400" />,
  info: <Info className="w-5 h-5 text-info-600 dark:text-info-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400" />,
};

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800',
  error: 'bg-danger-50 dark:bg-danger-900/20 border-danger-200 dark:border-danger-800',
  info: 'bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800',
  warning: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800',
};

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  description,
  variant = 'info',
  onClose,
}) => {
  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border animate-slide-up shadow-elevated max-w-sm',
        variantClasses[variant]
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{variantIcons[variant]}</div>
      <div className="flex-1">
        <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

Toast.displayName = 'Toast';

export { Toast, type ToastProps, type ToastVariant };
