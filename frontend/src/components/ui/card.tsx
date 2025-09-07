import { cn } from '../../lib/utils';
import { ReactNode } from 'react';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/50 shadow-soft hover:shadow-large hover:border-neutral-200 transition-all duration-300 hover:-translate-y-0.5 p-6', className)}>{children}</div>;
}
export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4 space-y-2">{children}</div>;
}
export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-bold text-neutral-900 leading-tight tracking-tight">{children}</h3>;
}
export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-500 leading-relaxed">{children}</p>;
}
export function CardContent({ children }: { children: ReactNode }) {
  return <div className="text-sm space-y-4 text-neutral-700">{children}</div>;
}
