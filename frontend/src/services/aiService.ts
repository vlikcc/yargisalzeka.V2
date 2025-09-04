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

export const aiService = {
  extractKeywords: (payload: KeywordExtractionRequest) => httpClient.post<KeywordExtractionResponse>(ENDPOINTS.AI.EXTRACT_KEYWORDS, payload),
  analyzeCase: (payload: CaseAnalysisRequest) => httpClient.post<CaseAnalysisResponse>(ENDPOINTS.AI.ANALYZE_CASE, payload)
  // scoreDecisions removed as it's not available in GeminiController
};
