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
    <div className={cn('card hover-lift group', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-500 mb-2 uppercase tracking-wide">{title}</p>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl font-bold gradient-text">
              {loading ? <Skeleton className="h-9 w-24 rounded-lg" /> : value ?? '-'}
            </span>
            {trend && trendValue && !loading && (
              <div className={cn(
                'flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold animate-slide-in-right',
                trend === 'up' && 'bg-gradient-to-r from-success-100 to-success-200 text-success-800',
                trend === 'down' && 'bg-gradient-to-r from-error-100 to-error-200 text-error-800',
                trend === 'neutral' && 'bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-800'
              )}>
                {trend === 'up' && <TrendingUp className="w-3 h-3" />}
                {trend === 'down' && <TrendingDown className="w-3 h-3" />}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center group-hover:shadow-glow transition-all duration-300 group-hover:scale-110">
            <div className="text-primary-700">
              {icon}
            </div>
          </div>
        )}
      </div>

      {description && (
        <p className="text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-4">
          {loading ? <Skeleton className="h-4 w-full rounded" /> : description}
        </p>
      )}
    </div>
  );
}
