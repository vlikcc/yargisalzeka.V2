interface StoredUser { id: string; email: string; firstName?: string; lastName?: string; role?: string; }

const TOKEN_KEY = 'yz_token';
const REFRESH_KEY = 'yz_refresh';
const USER_KEY = 'yz_user';

export const authStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_KEY),
  getUser: (): StoredUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try {
      return JSON.parse(raw);
    } catch {
      // Corrupt or incompatible data; clear and recover gracefully
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  setTokens: (token: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setUser: (u: StoredUser) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }
};
