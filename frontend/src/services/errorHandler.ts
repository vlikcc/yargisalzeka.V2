export class ApiError extends Error {
  status?: number;
  data?: unknown;
  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// AxiosError benzeri bir shape için minimal tip
interface HttpErrorLike { response?: { status: number; data?: unknown }; request?: unknown; message?: string }

export const handleApiError = (error: unknown): ApiError => {
  const err = error as HttpErrorLike;
  if (err?.response) {
    const { status, data } = err.response;
  const apiMessage = (data && typeof data === 'object' && 'message' in data) ? (data as { message?: string }).message : undefined;
  return new ApiError(apiMessage || 'API hatası', status, data);
  }
  if (err?.request) {
    return new ApiError('Sunucuya ulaşılamadı');
  }
  return new ApiError(err?.message || 'Bilinmeyen hata');
};

export async function retryWithBackoff<T>(fn: () => Promise<T>, attempts = 3, baseDelay = 500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastErr as Error;
}
