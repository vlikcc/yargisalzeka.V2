import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';

export interface SubscriptionPlan { id: number; name: string; price: number; validityDays?: number | null; isPopular?: boolean; }
export interface UserSubscription { id: number; subscriptionPlanId: number; startDate: string; endDate?: string | null; isActive: boolean; remainingDays?: number; plan?: SubscriptionPlan; }
export interface RemainingCredits { keywordExtraction: number; caseAnalysis: number; search: number; petition: number; }
export interface FeatureUsage { feature: string; percentage: number; }
export interface DailyUsage { date: string; petitions: number; searches: number; analyses: number; }
export interface UsageStats { totalThisMonth: number; featureUsage: FeatureUsage[]; daily: DailyUsage[]; searches: number; caseAnalyses: number; petitions: number; keywordExtractions: number; }

export const subscriptionService = {
  getCurrent: () => httpClient.get<UserSubscription>(ENDPOINTS.SUBSCRIPTION.CURRENT),
  getPlans: () => httpClient.get<SubscriptionPlan[]>(ENDPOINTS.SUBSCRIPTION.PLANS),
  getUsage: () => httpClient.get<UsageStats>(ENDPOINTS.SUBSCRIPTION.USAGE),
  getRemaining: () => httpClient.get<RemainingCredits>(ENDPOINTS.SUBSCRIPTION.REMAINING),
  consume: (featureType: string) => httpClient.post(ENDPOINTS.SUBSCRIPTION.CONSUME, { featureType }),
  upgrade: (planId: number) => httpClient.post(ENDPOINTS.SUBSCRIPTION.UPGRADE, { planId }),
  assignTrial: (userId: string) => httpClient.post(ENDPOINTS.SUBSCRIPTION.ASSIGN_TRIAL, { userId })
};
