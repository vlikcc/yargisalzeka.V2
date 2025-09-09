import { useState, useCallback } from 'react';
import { searchService, SearchRequest, SearchResponse, SearchHistoryItem } from '../services/searchService';
import { useSubscription } from '../contexts/SubscriptionContext';

export function useSearchFlow() {
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearchingDecisions, setIsSearchingDecisions] = useState(false);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
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
      setIsAnalyzing(true); // Arka planda tek backend çağrısı yapsak da kullanıcıya durum bilgisi verelim
      setIsSearchingDecisions(true);
      const backendResponse = await searchService.searchCases({ caseText: request.caseText });
      setIsAnalyzing(false);
      setIsExtractingKeywords(false);
      setIsSearchingDecisions(false);
      const decisionArray = Array.isArray((backendResponse as any).decisions) ? (backendResponse as any).decisions : [];
      const mapped = decisionArray.map((d: any) => {
        const metin: string = d?.kararMetni || '';
        const score = typeof d?.score === 'number' ? d.score : null;
        return {
          id: (d?.id ?? '').toString(),
          title: `${d?.yargitayDairesi ?? ''} - ${d?.esasNo ?? ''}/${d?.kararNo ?? ''}`.trim(),
          score: score ?? 0,
          court: d?.yargitayDairesi,
          summary: metin.length > 200 ? metin.substring(0, 200) + '...' : metin,
          explanation: d?.relevanceExplanation,
          similarity: d?.relevanceSimilarity
        } as any;
      });
      const backendAnalysisText = (backendResponse as any).analysis?.analysisResult || (backendResponse as any).analysis?.AnalysisResult || '';
      const backendKeywords = (backendResponse as any).keywords?.keywords || [];
      setResult({
        analysis: { AnalysisResult: backendAnalysisText } as any,
        keywords: { keywords: backendKeywords },
        searchId: Date.now().toString(),
        scoredDecisions: mapped
      });

      refreshSubscription();
      loadHistory();
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'Arama başarısız');
    } finally {
      setIsSearching(false);
    }
  }, [isSearching, refreshSubscription, loadHistory]);

  return { isSearching, isAnalyzing, isSearchingDecisions, isExtractingKeywords, result, history, error, runSearch, loadHistory };
}
