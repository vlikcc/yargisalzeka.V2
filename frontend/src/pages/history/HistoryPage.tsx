import { useEffect, useState } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';

export default function HistoryPage() {
  const { history, loadHistory } = useSearch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { (async () => { setLoading(true); try { await loadHistory(); } catch { setError('Geçmiş yüklenemedi'); } finally { setLoading(false); } })(); }, [loadHistory]);
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Geçmiş Aramalar</h2>
      <div className="space-y-2">
        {loading && <LoadingState />}
        {error && <ErrorState description={error} onRetry={() => loadHistory()} />}
        {history.map(h => (
          <div key={h.id} className="p-3 border rounded bg-white text-sm">
            <div className="font-medium">{h.title}</div>
            <div className="text-xs text-gray-500">Skor: {h.score}</div>
          </div>
        ))}
        {history.length === 0 && <div className="text-sm text-gray-500">Geçmiş boş</div>}
      </div>
      <Button onClick={() => loadHistory()} variant="outline" size="sm" className="font-medium">Yenile</Button>
    </div>
  );
}
