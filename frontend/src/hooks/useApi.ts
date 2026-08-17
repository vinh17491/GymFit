import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { apiErrorMessage } from '../api/error';

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
      setError(apiErrorMessage(err, 'Unable to load this data.'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { refetch(); }, deps);

  return { data, loading, error, refetch };
}
