import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';
import { SearchResponse } from './searchService';

// Frontend'in gönderdiği format
export interface PetitionGenerationPayload { caseData: SearchResponse; additionalRequests?: string; }

// Backend'in beklediği format
export interface PetitionGenerationRequest { 
  topic: string; 
  caseText: string; 
  decisions?: string[];
}
export interface PetitionResponse { id: string; downloadUrl: string; createdAt?: string; processingTime?: number; }
export interface PetitionHistoryItem { 
  id: string; 
  topic: string;
  createdAt: string; 
  status?: string;
  downloadUrl?: string; 
}

export const petitionService = {
  generate: (payload: PetitionGenerationPayload) => {
    // Frontend payload'ı backend formatına dönüştür
    const backendRequest: PetitionGenerationRequest = {
      topic: payload.additionalRequests || 'Hukuki Dilekçe Talebi',
      caseText: payload.caseData.analysis?.summary || 'Analiz özeti bulunamadı',
      decisions: payload.caseData.scoredDecisions?.map(d => d.title || d.id) || []
    };
    return httpClient.post<PetitionResponse>(ENDPOINTS.PETITION.GENERATE, backendRequest);
  },
  history: () => httpClient.get<PetitionHistoryItem[]>(ENDPOINTS.PETITION.HISTORY)
};
