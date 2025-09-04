import { useEffect } from 'react';
import { useSearch } from '../../contexts/SearchContext';
import { Skeleton } from '../ui/skeleton';

export function SearchHistoryList() {
  const { history, loadHistory, loading } = useSearch();

  useEffect(() => {
    if (history.length === 0) {
      loadHistory().catch(() => {/* silent */});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded border bg-white p-4 h-64 flex flex-col">
      <h3 className="font-medium mb-2">Son Aramalar</h3>
      {loading && history.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-sm text-gray-500 flex-1 flex items-center justify-center">Henüz arama yok</div>
      ) : (
        <ul className="space-y-2 overflow-auto pr-1 text-sm">
          {history.slice(0, 8).map(h => (
            <li key={h.id} className="border rounded p-2 hover:bg-gray-50">
              <div className="font-medium line-clamp-1 text-gray-700">{h.title}</div>
              <div className="text-xs text-gray-500">Skor: {h.score}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
