import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';
import { CaseAnalysisResponse, KeywordExtractionResponse } from './aiService';

export interface SearchFilters { courts?: string[]; caseTypes?: string[]; dateRange?: { from?: string; to?: string }; }
export interface SearchRequest { caseText: string; filters?: SearchFilters; }
export interface SearchResponse { analysis: CaseAnalysisResponse; keywords?: KeywordExtractionResponse; searchId: string; } 
export interface SearchHistoryItem { id: string; createdAt: string; analysis: CaseAnalysisResponse; topDecisionIds?: string[]; }
export interface SaveDecisionRequest { decisionId: string; notes?: string; }

export const searchService = {
  searchCases: (payload: SearchRequest) => httpClient.post<SearchResponse>(ENDPOINTS.SEARCH.SEARCH, payload),
  getHistory: () => httpClient.get<SearchHistoryItem[]>(ENDPOINTS.SEARCH.HISTORY),
  saveDecision: (payload: SaveDecisionRequest) => httpClient.post(ENDPOINTS.SEARCH.SAVE_DECISION, payload)
};
