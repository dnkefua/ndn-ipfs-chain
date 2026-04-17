'use client';

import React, { useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      <div
        className={clsx(
          'relative bg-white dark:bg-slate-900 rounded-2xl shadow-floating p-6 w-full mx-4 animate-slide-up',
          sizeClasses[size]
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {(title || description) && (
          <div className="mb-6 pr-8">
            {title && <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>}
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{description}</p>
            )}
          </div>
        )}

        <div className="mb-6">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';

export { Modal, type ModalProps };
