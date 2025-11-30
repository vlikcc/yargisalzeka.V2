import { useState, useCallback } from 'react';
import { searchService, SearchHistoryItem } from '../services/searchService';
import { aiService, CompositeSearchResponse, FullFlowResponse } from '../services/aiService';
import { useSubscription } from '../contexts/SubscriptionContext';

export function useSearchFlow() {
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<CompositeSearchResponse | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshSubscription } = useSubscription();

  const loadHistory = useCallback(async () => {
    try {
      const h = await searchService.getHistory();
      setHistory(h);
    } catch {
      // History yüklenemezse sessizce devam et
    }
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

// Yeni: Full-Flow hook - tek çağrıda analiz + arama + dilekçe
export function useFullFlow() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<FullFlowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refresh: refreshSubscription } = useSubscription();

  const runFullFlow = useCallback(async (request: { 
    caseText: string; 
    generatePetition?: boolean;
    petitionTopic?: string;
  }) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      const resp = await aiService.fullFlow({
        caseText: request.caseText,
        generatePetition: request.generatePetition ?? false,
        petitionTopic: request.petitionTopic
      });
      
      if (!resp.success) {
        setError(resp.errorMessage || 'İşlem başarısız');
      } else {
        setResult(resp);
      }
      refreshSubscription();
    } catch (e) {
      const err = e as Error;
      setError(err.message || 'İşlem başarısız');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshSubscription]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { isProcessing, result, error, runFullFlow, reset };
}
