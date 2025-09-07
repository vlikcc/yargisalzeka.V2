import { useState, useCallback } from 'react';
import { searchService, SearchRequest, SearchResponse, SearchHistoryItem } from '../services/searchService';
import { useSubscription } from '../contexts/SubscriptionContext';
import { aiService } from '../services/aiService';

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
      // 1) Önce sadece analiz (kullanıcıya hızlı feedback)
  setIsAnalyzing(true);
  const caseAnalysis = await aiService.analyzeCase({ caseText: request.caseText }).catch(() => ({ summary: 'Analiz hatası' } as any));
  setIsAnalyzing(false);
      const initialResult: SearchResponse = {
        analysis: { AnalysisResult: caseAnalysis?.summary || caseAnalysis?.analysisResult || 'Analiz yok' } as any,
        keywords: { keywords: [] },
        searchId: Date.now().toString(),
        scoredDecisions: []
      };
      setResult(initialResult);

      // 2) Karar araması (backend search + AI fallback zaten orada da var)
  setIsSearchingDecisions(true);
  const backendResponse = await searchService.searchCases(request.caseText);
      const decisionArray = Array.isArray((backendResponse as any).decisions) ? (backendResponse as any).decisions : [];
      initialResult.scoredDecisions = decisionArray.map((d: any) => {
        const metin: string = d?.kararMetni || '';
        return {
          id: (d?.id ?? '').toString(),
          title: `${d?.yargitayDairesi ?? ''} - ${d?.esasNo ?? ''}/${d?.kararNo ?? ''}`.trim(),
          score: 1,
          court: d?.yargitayDairesi,
          summary: metin.length > 200 ? metin.substring(0, 200) + '...' : metin
        };
      });
      // Eğer backend analysis gelmişse onu tercih et (daha tutarlı olabilir)
      const backendAnalysisText = (backendResponse as any).analysis?.analysisResult || (backendResponse as any).analysis?.AnalysisResult;
      if (backendAnalysisText) initialResult.analysis = { AnalysisResult: backendAnalysisText } as any;
      setResult({ ...initialResult });

      // 3) Anahtar kelimeler (analiz ve kararlar göründükten sonra)
      setIsSearchingDecisions(false);
      setIsExtractingKeywords(true);
      try {
        const kwResp: any = await aiService.extractKeywords({ caseText: request.caseText });
        // Backend şu an düz liste (string[]) döndürüyor; ileride { keywords: string[] } dönebilir.
        const rawKeywords: string[] = Array.isArray(kwResp)
          ? kwResp
          : (kwResp?.keywords && Array.isArray(kwResp.keywords) ? kwResp.keywords : []);
        const cleanKw = rawKeywords.filter(k => k && !k.toLowerCase().includes('error'));
        setResult(r => r ? { ...r, keywords: { keywords: cleanKw } } : r);
      } catch {
        // keywords isteği başarısız ise sessizce yoksay
      } finally {
        setIsExtractingKeywords(false);
      }

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
