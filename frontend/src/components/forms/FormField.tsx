import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface Props {
  label?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}
export function FormField({ label, error, children, className }: Props) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && <label className="text-sm font-medium text-gray-700 block">{label}</label>}
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
