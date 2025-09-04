import { createContext, useReducer, useContext, useEffect, ReactNode, useCallback } from 'react';
import { subscriptionService, SubscriptionPlan, UsageStats, RemainingCredits, UserSubscription } from '../services/subscriptionService';

interface State {
  plan: SubscriptionPlan | null;
  current: UserSubscription | null;
  usage: UsageStats | null;
  remaining: RemainingCredits | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'SUB_INIT'; payload: Partial<State> }
  | { type: 'SUB_LOADING' }
  | { type: 'SUB_SUCCESS'; payload: Partial<State> }
  | { type: 'SUB_ERROR'; payload: string };

const initialState: State = { plan: null, current: null, usage: null, remaining: null, loading: false, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SUB_LOADING':
      return { ...state, loading: true, error: null };
    case 'SUB_SUCCESS':
      return { ...state, ...action.payload, loading: false };
    case 'SUB_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SUB_INIT':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface ContextValue extends State { refresh: () => Promise<void>; }
const SubscriptionContext = createContext<ContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const load = useCallback(async () => {
    dispatch({ type: 'SUB_LOADING' });
    try {
      const [current, usage, remaining, plans] = await Promise.all([
        subscriptionService.getCurrent(),
        subscriptionService.getUsage(),
        subscriptionService.getRemaining(),
        subscriptionService.getPlans()
      ]);
      const activePlan = Array.isArray(plans) ? plans.find(p => p.id === (current as UserSubscription).subscriptionPlanId) || null : null;
      dispatch({ type: 'SUB_SUCCESS', payload: { current, usage, remaining, plan: activePlan } });
    } catch (e) {
      const err = e as Error;
      dispatch({ type: 'SUB_ERROR', payload: err.message || 'Abonelik verileri alınamadı' });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SubscriptionContext.Provider value={{ ...state, refresh: load }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be inside provider');
  return ctx;
}
