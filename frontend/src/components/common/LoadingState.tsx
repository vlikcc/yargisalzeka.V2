import { Spinner } from '../ui/spinner';
import { ReactNode } from 'react';

export function LoadingState({ message = 'Yükleniyor...', children }: { message?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600">
      <Spinner />
      <span>{message}</span>
      {children}
    </div>
  );
}
