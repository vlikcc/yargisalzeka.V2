import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';
import { CaseAnalysisResponse, KeywordExtractionResponse } from './aiService';

export interface SearchFilters { courts?: string[]; caseTypes?: string[]; dateRange?: { from?: string; to?: string }; }
export interface SearchRequest { caseText: string; filters?: SearchFilters; }
export interface ScoredDecision {
  id: string;
  title: string;
  score: number;
  court?: string;
  summary?: string;
}

export interface SearchResponse { 
  analysis: CaseAnalysisResponse; 
  keywords?: KeywordExtractionResponse; 
  searchId: string;
  scoredDecisions?: ScoredDecision[];
} 
// Backend'den gelen gerçek veri yapısı
export interface SearchHistoryItem { 
  id: number; 
  keywords: string[]; 
  resultCount: number; 
  createdAt: string; 
}

// Eski interface (ileride kullanılabilir)
export interface LegacySearchHistoryItem { id: string; createdAt: string; analysis: CaseAnalysisResponse; topDecisionIds?: string[]; }
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
export interface BackendSearchResponse {
  decisions: DecisionDto[];
  analysis: {
    analysisResult: string;
  };
  keywords: {
    keywords: string[];
  };
  totalResults: number;
}

export const searchService = {
  // Backend artık yalnızca CaseText alıyor; Keywords & SkipAnalysis gönderilmez.
  searchCases: (payload: { caseText: string }) =>
    httpClient.post<BackendSearchResponse>(ENDPOINTS.SEARCH.SEARCH, {
      CaseText: payload.caseText
    }),
  getHistory: () => httpClient.get<SearchHistoryItem[]>(ENDPOINTS.SEARCH.HISTORY),
  saveDecision: (payload: SaveDecisionRequest) => httpClient.post(ENDPOINTS.SEARCH.SAVE_DECISION, payload)
};
