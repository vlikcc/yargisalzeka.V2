import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../config/api';
import { authStore } from './localAuthStore';

class HttpClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(config => {
      const token = authStore.getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.client.interceptors.response.use(
      r => r,
      async error => {
        const original = error.config;
        if (error.response?.status === 401 && !original.__retry) {
          original.__retry = true;
          try {
            const refresh = authStore.getRefreshToken();
            if (!refresh) throw error;
            const resp = await this.client.post('/auth/refresh', { refreshToken: refresh });
            authStore.setTokens(resp.data.token, resp.data.refreshToken);
            original.headers.Authorization = `Bearer ${resp.data.token}`;
            return this.client(original);
          } catch (_e: unknown) {
            authStore.clear();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse<T> = await this.client.get(url, config);
    return res.data;
  }
  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse<T> = await this.client.post(url, data as D, config);
    return res.data;
  }
  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse<T> = await this.client.put(url, data as D, config);
    return res.data;
  }
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse<T> = await this.client.delete(url, config);
    return res.data;
  }
}

export const httpClient = new HttpClient();
