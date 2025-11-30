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

// Skorlu karar sonucu
export interface ScoredDecisionResult {
  id: number;
  title: string;
  excerpt: string;
  fullText?: string | null;
  decisionDate?: string | null;
  court: string;
  score?: number | null;
  relevanceExplanation?: string | null;
  relevanceSimilarity?: string | null;
}

// Composite search models
export interface CompositeSearchRequest { caseText: string; }
export interface CompositeSearchResponse {
  analysis: string;
  keywords: string[];
  decisions: ScoredDecisionResult[];
}

// Full-Flow: Tek çağrıda tüm akış (analiz + arama + dilekçe)
export interface FullFlowRequest { 
  caseText: string; 
  generatePetition?: boolean;
  petitionTopic?: string;
}

export interface FullFlowResponse {
  success: boolean;
  errorMessage?: string | null;
  // Adım 1: Olay Analizi
  analysis: string;
  // Adım 2: Anahtar Kelimeler
  keywords: string[];
  // Adım 3: Arama Sonuçları
  totalDecisionsFound: number;
  // Adım 4: En Uygun 3 Karar
  topDecisions: ScoredDecisionResult[];
  // Adım 5: Dilekçe (opsiyonel)
  petitionGenerated: boolean;
  petition?: string | null;
}

export const aiService = {
  extractKeywords: (payload: KeywordExtractionRequest) => 
    httpClient.post<KeywordExtractionResponse>(ENDPOINTS.AI.EXTRACT_KEYWORDS, payload),
  
  analyzeCase: (payload: CaseAnalysisRequest) => 
    httpClient.post<CaseAnalysisResponse>(ENDPOINTS.AI.ANALYZE_CASE, payload),
  
  // Mevcut composite search
  compositeSearch: (payload: CompositeSearchRequest) => 
    httpClient.post<CompositeSearchResponse>('/gemini/composite-search', payload, { timeout: 0 }),
  
  // Yeni: Tam akış - analiz, arama ve opsiyonel dilekçe tek seferde
  fullFlow: (payload: FullFlowRequest) => 
    httpClient.post<FullFlowResponse>('/gemini/full-flow', payload, { timeout: 0 })
};
