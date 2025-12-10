import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';

export interface SearchFilters { courts?: string[]; caseTypes?: string[]; dateRange?: { from?: string; to?: string }; }
// Eski çok aşamalı arama kaldırıldı; sadece backend history ve save kullanılıyor.
// Backend'den gelen gerçek veri yapısı
export interface SearchHistoryItem { 
  id: number; 
  keywords: string[]; 
  resultCount: number; 
  createdAt: string; 
}

export interface SaveDecisionRequest { decisionId: string; notes?: string; }

// Backend DecisionDto format
export interface DecisionDto {
  id: number;
  yargitayDairesi: string;
  esasNo: string;
  kararNo: string;
  kararTarihi: string | null;
  kararMetni: string;
  score?: number | null;
  relevanceExplanation?: string | null;
  relevanceSimilarity?: string | null;
}

// Kaydedilen karar
export interface SavedDecisionItem {
  decisionId: number;
  savedAt: string;
}

// Backend'den gelen kapsamlı response
// Artık Execute akışı yok; composite AI endpoint kullanılıyor.

export const searchService = {
  getHistory: () => httpClient.get<SearchHistoryItem[]>(ENDPOINTS.SEARCH.HISTORY),
  
  // Kaydedilen kararlar
  getSavedDecisions: () => httpClient.get<SavedDecisionItem[]>(ENDPOINTS.SEARCH.SAVED_DECISIONS),
  
  saveDecision: (decisionId: number) => httpClient.post(`${ENDPOINTS.SEARCH.SAVE_DECISION}/${decisionId}`, {}),
  
  removeDecision: (decisionId: number) => httpClient.delete(`${ENDPOINTS.SEARCH.SAVE_DECISION}/${decisionId}`)
};
