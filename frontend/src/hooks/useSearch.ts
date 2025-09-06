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
      // Backend'den kapsamlı response al (AI analiz + arama sonuçları)
  const backendResponse = await searchService.searchCases(request.caseText);
      
      // UI için uyumlu format oluştur
      const analysisText = (backendResponse as any).analysis?.analysisResult || (backendResponse as any).analysis?.AnalysisResult || 'Analiz bulunamadı';
      const kwList = backendResponse.keywords?.keywords?.filter(k => k && !k.toLowerCase().includes('error')) || [];
      const decisionArray = Array.isArray((backendResponse as any).decisions) ? (backendResponse as any).decisions : [];
      const searchResponse: SearchResponse = {
        analysis: { AnalysisResult: analysisText } as any,
        keywords: { keywords: kwList },
        searchId: Date.now().toString(),
        scoredDecisions: decisionArray.map((d: any) => {
          const metin: string = d?.kararMetni || '';
            return {
              id: (d?.id ?? '').toString(),
              title: `${d?.yargitayDairesi ?? ''} - ${d?.esasNo ?? ''}/${d?.kararNo ?? ''}`.trim(),
              score: 1,
              court: d?.yargitayDairesi,
              summary: metin.length > 200 ? metin.substring(0, 200) + '...' : metin
            };
        })
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
