import { useEffect, useState } from 'react';
import { isApiEnabled } from '../services/api';

export function useApiList(fetcher, mockFallback, deps = []) {
  const [data, setData] = useState(isApiEnabled() ? null : mockFallback);
  const [loading, setLoading] = useState(isApiEnabled());
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isApiEnabled()) {
      setData(mockFallback);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (import.meta.env.PROD) {
          setError(err);
        } else {
          console.warn('API 실패, mock fallback:', err.message);
          setData(mockFallback);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
