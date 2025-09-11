import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';

export interface KeywordExtractionRequest { caseText: string; }
export interface KeywordExtractionResponse { keywords: string[]; processingTime?: number; }
export interface CaseAnalysisRequest { caseText: string; }
export interface CaseAnalysisResponse { caseType: string; summary: string; legalAreas?: string[]; outcomes?: string[]; }
export interface Decision { id: string; keywords: string[]; }
export interface ScoredDecision { decision: Decision; score?: number; relevanceReasons: string[]; }
export interface DecisionScoringRequest { decisions: Decision[]; caseText: string; }
export interface DecisionScoringResponse { scoredDecisions: ScoredDecision[]; }

// Composite search models
export interface CompositeSearchRequest { caseText: string; }
export interface CompositeSearchResponse {
  analysis: string;
  keywords: string[];
  decisions: Array<{
    id: number;
    title: string;
    excerpt: string;
    decisionDate?: string | null;
    court: string;
    score?: number | null;
    relevanceExplanation?: string | null;
    relevanceSimilarity?: string | null;
  }>;
}

export const aiService = {
  extractKeywords: (payload: KeywordExtractionRequest) => httpClient.post<KeywordExtractionResponse>(ENDPOINTS.AI.EXTRACT_KEYWORDS, payload),
  analyzeCase: (payload: CaseAnalysisRequest) => httpClient.post<CaseAnalysisResponse>(ENDPOINTS.AI.ANALYZE_CASE, payload),
  compositeSearch: (payload: CompositeSearchRequest) => httpClient.post<CompositeSearchResponse>('/gemini/composite-search', payload)
  // scoreDecisions removed as it's not available in GeminiController
};
