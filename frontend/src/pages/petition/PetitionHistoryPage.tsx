import { useEffect } from 'react';
import { petitionService, PetitionHistoryItem } from '../../services/petitionService';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';
import { LoadingState } from '../../components/common/LoadingState';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/common/ErrorState';

export default function PetitionHistoryPage() {
  const { data, loading, error, run } = useAsyncOperation<PetitionHistoryItem[]>();

  useEffect(() => { void run(() => petitionService.history()); }, [run]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Dilekçe Geçmişi</h2>
      {loading && (
        <div className="space-y-3">
          <LoadingState message="Yükleniyor" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 border rounded bg-white flex justify-between items-center">
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-14" />
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <ErrorState description={error} onRetry={() => { void run(() => petitionService.history()); }} />}
      {!loading && data && data.length === 0 && <div className="text-sm text-gray-500">Kayıt yok</div>}
      <div className="space-y-2">
        {data?.map(item => (
          <div key={item.id} className="p-3 border rounded bg-white flex justify-between items-center">
            <div>
              <div className="font-medium text-sm">#{item.id}</div>
              <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
              <div className="text-xs text-gray-500">Durum: {item.status || 'Tamamlandı'}</div>
            </div>
            {item.downloadUrl && (
              <a className="text-xs text-blue-600 underline" href={item.downloadUrl} target="_blank" rel="noreferrer">İndir</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
