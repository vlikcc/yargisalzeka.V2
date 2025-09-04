import { httpClient } from './httpClient';
import { ENDPOINTS } from '../config/api';
import { authStore } from './localAuthStore';

export interface LoginDto { email: string; password: string; }
export interface RegisterDto { firstName: string; lastName: string; email: string; password: string; }
interface AuthUser { id: string; email: string; firstName?: string; lastName?: string; role?: string }
interface AuthResponse { token: string; expiresAtUtc: string }

function decodeJwt(token: string): any | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
  }
}

export const authService = {
  login: async (data: LoginDto) => {
    const res = await httpClient.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, data);
    const claims = decodeJwt(res.token);
    const user: AuthUser = {
      id: claims?.sub || '',
      email: claims?.email || data.email,
      role: claims?.role || claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'User'
    };
    authStore.setTokens(res.token, '');
    authStore.setUser(user);
    return { token: res.token, user };
  },
  register: async (data: RegisterDto) => {
    const res = await httpClient.post<AuthResponse>(ENDPOINTS.AUTH.REGISTER, data);
    const claims = decodeJwt(res.token);
    const user: AuthUser = {
      id: claims?.sub || '',
      email: claims?.email || data.email,
      role: claims?.role || claims?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || 'User'
    };
    authStore.setTokens(res.token, '');
    authStore.setUser(user);
    return { token: res.token, user };
  },
  logout: () => authStore.clear()
};
