import { createContext, useContext, ReactNode, useEffect, useReducer, useCallback } from 'react';
import { authStore } from '../services/localAuthStore';
import { authService } from '../services/authService';

export interface User { id: string; email: string; firstName?: string; lastName?: string; role?: string; }

interface AuthState { user: User | null; token: string | null; loading: boolean; error: string | null; }
type AuthAction =
  | { type: 'AUTH_LOGIN'; payload: { token: string; user: User } }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_INIT'; payload: { token: string | null; user: User | null } };

const initialState: AuthState = { user: null, token: null, loading: true, error: null };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_INIT':
      return { ...state, user: action.payload.user, token: action.payload.token, loading: false };
    case 'AUTH_LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, error: null };
    case 'AUTH_LOGOUT':
      return { ...state, user: null, token: null };
    case 'AUTH_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface AuthContextValue {
  state: AuthState;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const existingToken = authStore.getToken();
    const existingUser = authStore.getUser();
    dispatch({ type: 'AUTH_INIT', payload: { token: existingToken, user: existingUser } });
  }, []);

  const login = useCallback((token: string, user: User) => {
    authStore.setTokens(token, authStore.getRefreshToken() || '');
  authStore.setUser(user as { id: string; email: string; firstName?: string; lastName?: string });
    dispatch({ type: 'AUTH_LOGIN', payload: { token, user } });
  }, []);

  const logout = useCallback(() => {
    authStore.clear();
    authService.logout();
    dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
