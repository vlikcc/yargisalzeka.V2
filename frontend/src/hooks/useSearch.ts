import { useState, useCallback } from 'react';
import { searchService, SearchRequest, SearchResponse, SearchHistoryItem } from '../services/searchService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { aiService } from '../services/aiService';

export function useSearchFlow() {
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshSubscription } = useSubscription();

  const loadHistory = useCallback(async () => {
    const h = await searchService.getHistory();
    setHistory(h);
  }, []);

  const runSearch = useCallback(async (request: SearchRequest) => {
    if (isSearching) return;
    setIsSearching(true);
    setError(null);
    try {
      const [analysis, keywords] = await Promise.all([
        aiService.analyzeCase({ caseText: request.caseText }),
        aiService.extractKeywords({ caseText: request.caseText })
      ]);

      const searchRes = await searchService.searchCases({ caseText: request.caseText, filters: request.filters });
      setResult({ ...searchRes, analysis, keywords });
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
