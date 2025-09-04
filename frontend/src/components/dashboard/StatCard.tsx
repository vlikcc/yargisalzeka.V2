import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from '../ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value?: string | number;
  description?: string;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon,
  loading,
  className,
  trend,
  trendValue
}: StatCardProps) {
  return (
    <div className={cn('card p-6 group', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-neutral-900">
              {loading ? <Skeleton className="h-9 w-20" /> : value ?? '-'}
            </span>
            {trend && trendValue && !loading && (
              <div className={cn(
                'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
                trend === 'up' && 'bg-success-100 text-success-700',
                trend === 'down' && 'bg-error-100 text-error-700',
                trend === 'neutral' && 'bg-neutral-100 text-neutral-700'
              )}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-200 transition-colors duration-200">
            <div className="text-primary-600">
              {icon}
            </div>
          </div>
        )}
      </div>

      {description && (
        <p className="text-sm text-neutral-500 leading-relaxed">
          {loading ? <Skeleton className="h-4 w-full" /> : description}
        </p>
      )}
    </div>
  );
}
