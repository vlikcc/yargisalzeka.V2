import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';
import { } from './aiService';

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

// Backend'den gelen kapsamlı response
// Artık Execute akışı yok; composite AI endpoint kullanılıyor.

export const searchService = {
  getHistory: () => httpClient.get<SearchHistoryItem[]>(ENDPOINTS.SEARCH.HISTORY),
  saveDecision: (payload: SaveDecisionRequest) => httpClient.post(ENDPOINTS.SEARCH.SAVE_DECISION, payload)
};
