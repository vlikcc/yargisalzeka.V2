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
  const t0 = performance.now();
      // 1) Analiz (kullanıcıya hızlı feedback)
  setIsAnalyzing(true);
  const caseAnalysis = await aiService.analyzeCase({ caseText: request.caseText }).catch(() => ({ summary: 'Analiz hatası' } as any));
  setIsAnalyzing(false);
  const tAnalysis = performance.now();
      const initialResult: SearchResponse = {
        analysis: { AnalysisResult: caseAnalysis?.summary || caseAnalysis?.analysisResult || 'Analiz yok' } as any,
        keywords: { keywords: [] },
        searchId: Date.now().toString(),
        scoredDecisions: []
      };
      setResult(initialResult);
      // 2) Anahtar kelimeler (analiz sonrası hemen)
      setIsExtractingKeywords(true);
  let tKeywords: number | undefined = undefined;
      try {
        const kwResp: any = await aiService.extractKeywords({ caseText: request.caseText });
        // Backend şu an düz liste (string[]) döndürüyor; ileride { keywords: string[] } dönebilir.
        const rawKeywords: string[] = Array.isArray(kwResp)
          ? kwResp
          : (kwResp?.keywords && Array.isArray(kwResp.keywords) ? kwResp.keywords : []);
        const cleanKw = rawKeywords.filter(k => k && !k.toLowerCase().includes('error'));
        setResult(r => r ? { ...r, keywords: { keywords: cleanKw } } : r);
  tKeywords = performance.now();
      } catch {
        // keywords isteği başarısız ise sessizce yoksay
      } finally {
        setIsExtractingKeywords(false);
      }

      // 3) Karar araması (artık anahtar kelimeler elde edildi; backend şu an sadece CaseText kullanıyor)
      setIsSearchingDecisions(true);
      const currentKeywords = result?.keywords?.keywords || [];
      const backendResponse = await searchService.searchCases({
        caseText: request.caseText,
        keywords: currentKeywords.length > 0 ? currentKeywords : undefined,
        skipAnalysis: true // Frontend analiz & keywords çıkardı; backend tekrar yapmasın
      });
      const tSearch = performance.now();
      const decisionArray = Array.isArray((backendResponse as any).decisions) ? (backendResponse as any).decisions : [];
      initialResult.scoredDecisions = decisionArray.map((d: any) => {
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
      const backendAnalysisText = (backendResponse as any).analysis?.analysisResult || (backendResponse as any).analysis?.AnalysisResult;
      if (backendAnalysisText) initialResult.analysis = { AnalysisResult: backendAnalysisText } as any;
      setResult(r => ({ ...(r || initialResult), scoredDecisions: initialResult.scoredDecisions, analysis: initialResult.analysis }));
      setIsSearchingDecisions(false);

      // Süre loglama (development)
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[SEARCH FLOW] ms:', {
          analysis: Math.round(tAnalysis - t0),
          keywords: typeof tKeywords !== 'undefined' ? Math.round(tKeywords - tAnalysis) : null,
          search: Math.round(tSearch - (tKeywords ?? tAnalysis)),
          total: Math.round(tSearch - t0)
        });
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
