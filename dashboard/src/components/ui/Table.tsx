'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  stickyHeader?: boolean;
}

const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader = false, ...props }, ref) => (
    <div className={clsx('w-full overflow-x-auto rounded-card border border-slate-200 dark:border-slate-800')}>
      <table
        ref={ref}
        className={clsx('w-full text-sm', stickyHeader && '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10', className)}
        {...props}
      />
    </div>
  )
);

Table.displayName = 'Table';

interface THeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const THead = forwardRef<HTMLTableSectionElement, THeadProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={clsx('bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800', className)}
      {...props}
    />
  )
);

THead.displayName = 'THead';

interface TBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TBody = forwardRef<HTMLTableSectionElement, TBodyProps>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={className} {...props} />
  )
);

TBody.displayName = 'TBody';

interface TrProps extends React.HTMLAttributes<HTMLTableRowElement> {}

const Tr = forwardRef<HTMLTableRowElement, TrProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={clsx('border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors', className)}
      {...props}
    />
  )
);

Tr.displayName = 'Tr';

interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

const Th = forwardRef<HTMLTableCellElement, ThProps>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={clsx('text-left px-4 py-3 font-semibold text-slate-900 dark:text-slate-100', className)}
      {...props}
    />
  )
);

Th.displayName = 'Th';

interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

const Td = forwardRef<HTMLTableCellElement, TdProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={clsx('px-4 py-3 text-slate-700 dark:text-slate-300', className)}
      {...props}
    />
  )
);

Td.displayName = 'Td';

export { Table, THead, TBody, Tr, Th, Td, type TableProps };
