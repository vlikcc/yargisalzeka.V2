import { Alert } from '../ui/alert';

export function ErrorState({ title = 'Hata', description = 'Bir hata oluştu', onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive" title={title} description={description}>
      {onRetry && <button onClick={onRetry} className="mt-2 text-xs underline">Tekrar dene</button>}
    </Alert>
  );
}
