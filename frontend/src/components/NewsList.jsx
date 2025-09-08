import { useEffect, useMemo, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

const PAGE_SIZE = 5;

export default function NewsList() {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const maxPage = useMemo(() => {
    if (total == null) return 0;
    return Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  }, [total]);

  useEffect(() => {
    let abort = false;
    async function load() {
      if (!API_BASE) {
        setErr('Falta VITE_API_BASE');
        return;
      }
      setLoading(true);
      setErr('');
      try {
        const url = `${API_BASE}/api/feed?page=${page}&pageSize=${PAGE_SIZE}`;
        const r = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (abort) return;
        if (!data.ok) throw new Error(data.error || 'Error API');
        setItems(data.items || []);
        setTotal(typeof data.total === 'number' ? data.total : (data.items?.length ?? 0));
      } catch (e) {
        if (!abort) setErr(e.message);
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => { abort = true; };
  }, [page]);

  return (
    <section className="news">
      <header className="news__header">
        <h2>Últimas noticias</h2>
        <div className="news__pager">
          <button disabled={page <= 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}>
            « Anterior
          </button>
          <span className="news__pageinfo">
            {total == null ? '...' : `Página ${page + 1} de ${maxPage + 1}`}
          </span>
          <button disabled={total == null || page >= maxPage || loading} onClick={() => setPage(p => p + 1)}>
            Siguiente »
          </button>
        </div>
      </header>

      {loading && <p className="muted">Cargando…</p>}
      {err && <p className="error">Error: {err}</p>}

      <ul className="news__list">
        {items.map((it) => (
          <li key={it.guid || it.link} className="news__item">
            <a href={it.link} target="_blank" rel="noreferrer" className="news__title">
              {it.title || '(sin título)'}
            </a>
            {it.isoDate && <time className="news__date">{new Date(it.isoDate).toLocaleString()}</time>}
            {it.description && <p className="news__desc">{it.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
