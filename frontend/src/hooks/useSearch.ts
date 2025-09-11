import { useState, useCallback } from 'react';
import { searchService, SearchHistoryItem } from '../services/searchService';
import { aiService, CompositeSearchResponse } from '../services/aiService';
import { useSubscription } from '../contexts/SubscriptionContext';

export function useSearchFlow() {
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CompositeSearchResponse | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshSubscription } = useSubscription();

  const loadHistory = useCallback(async () => {
    const h = await searchService.getHistory();
    setHistory(h);
  }, []);

  const runSearch = useCallback(async (request: { caseText: string }) => {
    if (isSearching) return;
    setIsSearching(true);
    setError(null);
    try {
      const resp = await aiService.compositeSearch({ caseText: request.caseText });
      setResult(resp);
      refreshSubscription();
      loadHistory();
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Arama başarısız');
    } finally {
      setIsSearching(false);
    }
  }, [isSearching, refreshSubscription, loadHistory]);

  return { isSearching, result, history, error, runSearch, loadHistory };
}
