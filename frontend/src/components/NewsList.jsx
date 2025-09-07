// frontend/src/components/NewsList.jsx
import { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE;

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function NewsList() {
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ok | error
  const [error, setError] = useState(null);

  useEffect(() => {
    let abort = false;

    async function load() {
      setState('loading');
      setError(null);

      // Intenta leer último snapshot local (para UX)
      const cached = localStorage.getItem('lorra:news');
      if (cached && items.length === 0) {
        try {
          const parsed = JSON.parse(cached);
          if (!abort && parsed?.length) setItems(parsed);
        } catch {}
      }

      try {
        const r = await fetch(`${API_BASE}/api/feed`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (abort) return;

        if (data?.ok && Array.isArray(data.items)) {
          setItems(data.items);
          setState('ok');
          localStorage.setItem('lorra:news', JSON.stringify(data.items));
        } else {
          throw new Error('Respuesta inválida');
        }
      } catch (e) {
        console.error(e);
        if (!abort) {
          setState('error');
          setError(e.message);
        }
      }
    }

    load();
    return () => { abort = true; };
  }, []);

  if (state === 'loading' && items.length === 0) {
    return <p className="text-center opacity-70">Cargando noticias…</p>;
  }

  if (state === 'error' && items.length === 0) {
    return (
      <div className="text-center text-red-400">
        <p>Ups, no pudimos cargar el feed.</p>
        <small>{error}</small>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl mt-8 px-4">
      <h2 className="text-2xl font-semibold mb-4">Últimas noticias</h2>

      <ul className="space-y-3">
        {items.map((it, idx) => (
          <li key={it.guid || it.link || idx} className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium leading-snug">{it.title}</h3>
                {it.isoDate && (
                  <p className="text-sm opacity-70 mt-1">{formatDate(it.isoDate)}</p>
                )}
                {it.description && (
                  <p className="text-sm opacity-80 mt-2 line-clamp-2">{it.description}</p>
                )}
              </div>

              <div className="shrink-0">
                <a
                  className="inline-flex items-center rounded-lg px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                  href={it.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {state === 'error' && items.length > 0 && (
        <p className="text-center text-yellow-400 mt-4">
          Mostrando datos en caché. Error al actualizar: {error}
        </p>
      )}
    </div>
  );
}
