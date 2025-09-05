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
export interface SearchHistoryItem { id: string; createdAt: string; analysis: CaseAnalysisResponse; topDecisionIds?: string[]; }
export interface SaveDecisionRequest { decisionId: string; notes?: string; }

// Backend DecisionDto format
export interface DecisionDto {
  id: number;
  yargitayDairesi: string;
  esasNo: string;
  kararNo: string;
  kararTarihi: string | null;
  kararMetni: string;
}

export const searchService = {
  searchCases: (caseText: string) => httpClient.post<DecisionDto[]>(ENDPOINTS.SEARCH.SEARCH, { CaseText: caseText }),
  getHistory: () => httpClient.get<SearchHistoryItem[]>(ENDPOINTS.SEARCH.HISTORY),
  saveDecision: (payload: SaveDecisionRequest) => httpClient.post(ENDPOINTS.SEARCH.SAVE_DECISION, payload)
};
