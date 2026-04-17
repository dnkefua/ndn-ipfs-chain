'use client';

import React from 'react';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';

interface TrendData {
  value: number;
  direction: 'up' | 'down';
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: TrendData;
  description?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  description,
  className,
}) => {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between mb-4">
        {icon && <div className="text-2xl opacity-60">{icon}</div>}
        {trend && (
          <Badge
            variant={trend.direction === 'up' ? 'success' : 'danger'}
            size="sm"
            className="flex items-center gap-1"
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend.value)}%
          </Badge>
        )}
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
        {value}
      </p>

      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-500">{description}</p>
      )}
    </Card>
  );
};

StatCard.displayName = 'StatCard';

export { StatCard, type StatCardProps, type TrendData };
