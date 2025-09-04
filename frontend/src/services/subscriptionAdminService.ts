import { httpClient } from './httpClient';

export interface AdminPlan {
  id: number;
  name: string;
  price: number;
  validityDays?: number | null;
  keywordExtractionLimit: number;
  caseAnalysisLimit: number;
  searchLimit: number;
  petitionLimit: number;
  isActive: boolean;
}

export interface PlanInput {
  name: string;
  price: number;
  validityDays: number | null;
  keywordExtractionLimit: number;
  caseAnalysisLimit: number;
  searchLimit: number;
  petitionLimit: number;
  isActive: boolean;
}

class SubscriptionAdminService {
  // Use ApiGateway upstream without /api prefix (gateway supports both, keep it consistent with other calls)
  private base = '/subscription/admin/plans';

  async getAll(): Promise<AdminPlan[]> {
  return await httpClient.get<AdminPlan[]>(this.base);
  }
  async create(input: PlanInput): Promise<void> {
  await httpClient.post<void, PlanInput>(this.base, input);
  }
  async update(id: number, input: PlanInput): Promise<void> {
  await httpClient.put<void, PlanInput>(`${this.base}/${id}`, input);
  }
  async toggle(id: number): Promise<void> {
  await httpClient.post<void>(`${this.base}/${id}/toggle`, {});
  }
  async remove(id: number): Promise<void> {
  await httpClient.delete<void>(`${this.base}/${id}`);
  }
}

export const subscriptionAdminService = new SubscriptionAdminService();
