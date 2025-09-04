import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';
import { SearchResponse } from './searchService';

export interface PetitionGenerationRequest { caseData: SearchResponse; additionalRequests?: string; }
export interface PetitionResponse { id: string; downloadUrl: string; createdAt?: string; processingTime?: number; }
export interface PetitionHistoryItem { id: string; downloadUrl?: string; createdAt: string; status?: string; }

export const petitionService = {
  generate: (payload: PetitionGenerationRequest) => httpClient.post<PetitionResponse>(ENDPOINTS.PETITION.GENERATE, payload),
  history: () => httpClient.get<PetitionHistoryItem[]>(ENDPOINTS.PETITION.HISTORY)
};
