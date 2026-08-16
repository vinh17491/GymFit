import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

export function useApi<T>(url: string, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: res } = await api.get(url);
      setData(res.data);
    } catch (err: unknown) {
      const value=err as {response?:{data?:{message?:string}};message?:string};
      const msg = value.response?.data?.message || value.message || 'An error occurred';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { refetch(); }, deps);

  return { data, loading, error, refetch };
}
