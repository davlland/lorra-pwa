import { useEffect, useRef, useState } from 'react';

const API = import.meta.env.VITE_API_BASE;

export default function useFeed(page = 0, pageSize = 5) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const url = `${API}/api/feed?page=${page}&pageSize=${pageSize}`;

    fetch(url, { signal: ctrl.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!data?.ok) throw new Error(data?.error || 'Error leyendo feed');
        setItems(data.items || []);
        setTotal(
          typeof data.total === 'number'
            ? data.total
            : (data.items?.length || 0) + page * pageSize
        );
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e);
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, pageCount, loading, error };
}
