import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';
import { CompositeSearchResponse } from './aiService';

// CompositeSearch sonucu ile dilekçe üretimi için payload
export interface PetitionFromSearchPayload {
  searchResult: CompositeSearchResponse;
  topic?: string;
  originalCaseText: string;
}

// Backend'in beklediği format
export interface PetitionGenerationRequest { 
  topic: string; 
  caseText: string; 
  decisions?: string[];
}

// Backend'den dönen yanıt
export interface PetitionResponse { 
  id: string; 
  content: string;  // Dilekçe içeriği
  topic: string;
  createdAt: string;
}

// Dilekçe geçmişi item
export interface PetitionHistoryItem { 
  id: string; 
  topic: string;
  createdAt: string; 
  status?: string;
  preview?: string;  // Dilekçe önizlemesi
  downloadUrl?: string; 
}

// Dilekçe detayı
export interface PetitionDetail {
  id: string;
  topic: string;
  caseText: string;
  content: string;
  decisions: string[];
  createdAt: string;
}

export const petitionService = {
  // CompositeSearch sonucundan dilekçe oluştur
  generateFromSearch: (payload: PetitionFromSearchPayload) => {
    const backendRequest: PetitionGenerationRequest = {
      topic: payload.topic || 'Hukuki Dilekçe Talebi',
      caseText: payload.originalCaseText,
      decisions: payload.searchResult.decisions?.map(d => 
        `${d.title} (Skor: ${d.score ?? '-'}) - ${d.relevanceExplanation || d.excerpt?.substring(0, 100) || ''}`
      ) || []
    };
    return httpClient.post<PetitionResponse>(ENDPOINTS.PETITION.GENERATE, backendRequest, { timeout: 120000 });
  },

  // Doğrudan generate (eski uyumluluk)
  generate: (request: PetitionGenerationRequest) => {
    return httpClient.post<PetitionResponse>(ENDPOINTS.PETITION.GENERATE, request, { timeout: 120000 });
  },

  // Dilekçe geçmişi
  history: () => httpClient.get<PetitionHistoryItem[]>(ENDPOINTS.PETITION.HISTORY),

  // Dilekçe detayı
  getById: (id: string) => httpClient.get<PetitionDetail>(`/petition/${id}`)
};
