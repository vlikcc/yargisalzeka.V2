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
      // Backend artık tüm AI işlemlerini yapıyor, sadece caseText gönder
      const decisions = await searchService.searchCases(request.caseText);
      
      // UI için uyumlu format oluştur
      const searchResponse: SearchResponse = {
        analysis: { AnalysisResult: 'Backend analiz tamamlandı' },
        keywords: { keywords: [] }, // Backend'den anahtar kelimeler dönmüyor artık
        searchId: Date.now().toString(),
        scoredDecisions: decisions.map(d => ({
          id: d.id.toString(),
          title: `${d.yargitayDairesi} - ${d.esasNo}/${d.kararNo}`,
          score: 1,
          court: d.yargitayDairesi,
          summary: d.kararMetni.length > 200 ? d.kararMetni.substring(0, 200) + '...' : d.kararMetni
        }))
      };
      
      setResult(searchResponse);
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
