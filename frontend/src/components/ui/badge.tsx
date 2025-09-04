import { cn } from '../../lib/utils';

const variants: Record<string,string> = {
  default: 'bg-primary text-white',
  secondary: 'bg-secondary text-white',
  outline: 'border border-gray-300 text-gray-700',
  success: 'bg-green-600 text-white',
  warning: 'bg-amber-500 text-white',
  destructive: 'bg-red-600 text-white'
};

export function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: keyof typeof variants; className?: string; }) {
  return <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', variants[variant], className)}>{children}</span>;
}
