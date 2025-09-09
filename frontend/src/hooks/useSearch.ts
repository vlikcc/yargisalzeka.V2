import { useState, useCallback } from 'react';
import { searchService, SearchResponse, SearchHistoryItem } from '../services/searchService';
import { aiService } from '../services/aiService';
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

  const runSearch = useCallback(async (request: { caseText: string }) => {
    if (isSearching) return;
    setIsSearching(true);
    setError(null);
    try {
      // A) Analiz
      setIsAnalyzing(true);
      const analysisResp = await aiService.analyzeCase({ caseText: request.caseText }).catch(() => ({ summary: 'Analiz hatası' } as any));
      setIsAnalyzing(false);

      // B) Anahtar kelimeler (paralel gidebilirdi ama sıralı tutuyoruz)
      setIsExtractingKeywords(true);
      let extracted: string[] = [];
      try {
        const kw = await aiService.extractKeywords({ caseText: request.caseText }).catch(() => ({ keywords: [] }));
        extracted = (kw as any)?.keywords || [];
      } finally {
        setIsExtractingKeywords(false);
      }

      // Kullanıcıya analiz ve keywords hemen yansıt
      setResult({
        analysis: { AnalysisResult: (analysisResp as any).summary || (analysisResp as any).analysisResult || '' } as any,
        keywords: { keywords: extracted },
        searchId: Date.now().toString(),
        scoredDecisions: []
      });

      // C) Karar araması
      setIsSearchingDecisions(true);
      const exec = await searchService.execute({ caseText: request.caseText, keywords: extracted });
      setIsSearchingDecisions(false);

      const mapped = exec.decisions.map((d: any) => {
        const metin: string = d?.kararMetni || '';
        return {
          id: (d?.id ?? '').toString(),
          title: `${d?.yargitayDairesi ?? ''} - ${d?.esasNo ?? ''}/${d?.kararNo ?? ''}`.trim(),
          score: typeof d?.score === 'number' ? d.score : 0,
          court: d?.yargitayDairesi,
          summary: metin.length > 200 ? metin.substring(0, 200) + '...' : metin,
          explanation: d?.relevanceExplanation,
          similarity: d?.relevanceSimilarity
        } as any;
      });
      setResult(r => r ? { ...r, scoredDecisions: mapped } : r);

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
