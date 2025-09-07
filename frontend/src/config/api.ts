// Resolve API base URL and harden against leaking localhost in hosted envs
const RESOLVED_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:5161' : '/api');

// If running on a real host (not localhost/127.0.0.1), always use same-origin "/api"
// This prevents accidental builds from pointing to local machines.
const SAFE_BASE = (() => {
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
    if (!isLocalHost && hostname) {
      return '/api';
    }
    // Extra guard: if production build somehow contains a localhost absolute URL, force "/api"
    const isProd = !import.meta.env.DEV;
    if (isProd && /^https?:\/\/localhost(?::\d+)?\/?/.test(RESOLVED_BASE)) {
      return '/api';
    }
  } catch {}
  return RESOLVED_BASE;
})();

export const API_CONFIG = {
  // Base URL resolution order:
  // 1) Explicit env override via VITE_API_BASE_URL
  // 2) Dev server (vite) -> talk to local ApiGateway
  // 3) Production build -> same-origin "/api" (Nginx proxies to ApiGateway)
  BASE_URL: SAFE_BASE,
  TIMEOUT: Number(import.meta.env.VITE_HTTP_TIMEOUT || 45000)
};

export const ENDPOINTS = {
  AUTH: {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  PROFILE: '/auth/profile'
  },
  SUBSCRIPTION: {
  CURRENT: '/subscription/current',
  PLANS: '/subscription/plans',
  USAGE: '/subscription/usage',
  REMAINING: '/subscription/remaining-credits',
  CONSUME: '/subscription/consume',
  UPGRADE: '/subscription/upgrade',
  ASSIGN_TRIAL: '/subscription/assign-trial'
  },
  AI: {
    ANALYZE_CASE: '/gemini/analyze-case',
    EXTRACT_KEYWORDS: '/gemini/extract-keywords',
    SCORE_DECISIONS: '/gemini/score-decisions'
  },
  SEARCH: {
    SEARCH: '/search',
    HISTORY: '/search/history',
    SAVE_DECISION: '/search/save/{decisionId}'
  },
  PETITION: {
    GENERATE: '/petition/generate',
    HISTORY: '/petition/history'
  }
};
