import React from 'react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, change, trend, icon, className, onClick }: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000) {
        return `₹${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  const clickable = typeof onClick === 'function';

  const cardClass = cn(
    'card',
    clickable && 'cursor-pointer transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400',
    className
  );

  const content = (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {formatValue(value)}
        </p>
        {change && (
          <p className={cn(
            'text-sm mt-1 flex items-center',
            trend === 'up' && 'text-success-600',
            trend === 'down' && 'text-error-600',
            trend === 'neutral' && 'text-gray-600'
          )}>
            {change}
          </p>
        )}
      </div>
      {icon && (
        <div className="ml-4 p-2 bg-primary-50 rounded-lg">
          {icon}
        </div>
      )}
    </div>
  );

  if (clickable) {
    return (
      <button type="button" className={cardClass} onClick={onClick} tabIndex={0}>
        {content}
      </button>
    );
  }
  return <div className={cardClass}>{content}</div>;
}