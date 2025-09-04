import { useState, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  progress?: number;
}

export function useAsyncOperation<T>() {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: false, error: null });

  const run = useCallback(async (op: () => Promise<T>) => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await op();
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      const err = e as Error;
      setState(s => ({ ...s, loading: false, error: err.message || 'İşlem hatası' }));
      throw err;
    }
  }, []);

  return { ...state, run };
}
