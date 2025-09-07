import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('flex h-11 w-full rounded-xl border border-neutral-200 bg-white/50 backdrop-blur-sm px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200', className)}
    {...props}
  />
));
Input.displayName = 'Input';
