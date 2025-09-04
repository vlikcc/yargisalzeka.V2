import { cn } from '../../lib/utils';
import { ReactNode } from 'react';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-lg border bg-white p-5 shadow-sm', className)}>{children}</div>;
}
export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="mb-3 space-y-1">{children}</div>;
}
export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold leading-none tracking-tight">{children}</h3>;
}
export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}
export function CardContent({ children }: { children: ReactNode }) {
  return <div className="text-sm space-y-3">{children}</div>;
}
