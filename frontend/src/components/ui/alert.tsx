import { cn } from '../../lib/utils';
import { ReactNode } from 'react';

interface AlertProps {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-blue-50 text-blue-800 border-blue-200',
  destructive: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  success: 'bg-green-50 text-green-800 border-green-200'
};

export function Alert({ variant = 'default', title, description, children, className }: AlertProps) {
  return (
    <div className={cn('border rounded p-3 text-sm space-y-1', variantClasses[variant], className)}>
      {title && <div className="font-medium">{title}</div>}
      {description && <div className="opacity-90 leading-relaxed">{description}</div>}
      {children}
    </div>
  );
}
