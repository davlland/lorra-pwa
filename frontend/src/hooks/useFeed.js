// frontend/src/hooks/useFeed.js
import { useCallback, useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_BASE;

// Cambia este valor si quieres otro intervalo (en ms)
const REFRESH_MS = 5 * 60 * 1000; // 5 minutos

export default function useFeed(page = 0, pageSize = 5) {
  const [items, setItems] = useState([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // “nonce” para forzar recarga sin cambiar página
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce(n => n + 1), []);

  async function load(signal) {
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/api/feed?page=${page}&pageSize=${pageSize}&_=${nonce}`;
      const r = await fetch(url, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();

      setItems(Array.isArray(j.items) ? j.items : []);

      // Si el backend envía "total", úsalo; si no, heurística
      let pc = 1;
      if (typeof j.total === 'number') {
        pc = Math.max(1, Math.ceil(j.total / pageSize));
      } else {
        pc = (j.items?.length ?? 0) < pageSize ? page + 1 : Math.max(page + 2, 1);
      }
      setPageCount(pc);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e);
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial + cuando cambian page/pageSize/nonce
  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, nonce]);

  // Auto-refresh al volver al foco y cada REFRESH_MS si está visible
  useEffect(() => {
    const onFocus = () => document.visibilityState === 'visible' && refetch();
    const onVisibility = () => document.visibilityState === 'visible' && refetch();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') refetch();
    }, REFRESH_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(id);
    };
  }, [refetch]);

  return { items, pageCount, loading, error, refetch }; // refetch queda por si lo quieres usar en debug
}
