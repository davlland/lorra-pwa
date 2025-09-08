import { useEffect, useMemo, useState } from 'react';
import useFeed from '../hooks/useFeed';
import './NewsList.css';

const PAGE_SIZE = 5;

export default function NewsList() {
  const [page, setPage] = useState(0);
  const { items, pageCount, loading, error } = useFeed(page, PAGE_SIZE);

  // Guardar enlaces leídos en localStorage
  const [read, setRead] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('readLinks') || '[]'));
    } catch {
      return new Set();
    }
  });

  const markRead = (link) => {
    const next = new Set(read);
    next.add(link);
    setRead(next);
    localStorage.setItem('readLinks', JSON.stringify([...next]));
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const canPrev = page > 0;
  const canNext = page + 1 < pageCount;
  const list = useMemo(() => items || [], [items]);

  return (
    <section className="news">
      <h2 className="news__title">Últimas noticias</h2>

      <Pager
        page={page}
        pageCount={pageCount}
        onPrev={() => canPrev && setPage((p) => p - 1)}
        onNext={() => canNext && setPage((p) => p + 1)}
        disabledPrev={!canPrev}
        disabledNext={!canNext}
      />

      {loading && <div className="news__skel" aria-live="polite">Cargando…</div>}
      {error && (
        <div className="news__error" role="alert">
          Error: {String(error.message || error)}
        </div>
      )}

      {list.map((it) => (
        <article
          key={it.guid || it.link}
          className={`news-card ${read.has(it.link) ? 'is-read' : ''}`}
        >
          <header className="news-card__head">
            <a
              href={it.link}
              target="_blank"
              rel="noreferrer"
              onClick={() => markRead(it.link)}
              className="news-card__title"
            >
              {it.title}
            </a>
            {it.isoDate && (
              <time className="news-card__time">
                {new Date(it.isoDate).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            )}
          </header>
          <p className="news-card__desc">{it.description}</p>
        </article>
      ))}

      <Pager
        page={page}
        pageCount={pageCount}
        onPrev={() => canPrev && setPage((p) => p - 1)}
        onNext={() => canNext && setPage((p) => p + 1)}
        disabledPrev={!canPrev}
        disabledNext={!canNext}
      />
    </section>
  );
}

function Pager({ page, pageCount, onPrev, onNext, disabledPrev, disabledNext }) {
  return (
    <div className="pager">
      <button
        className="btn"
        onClick={onPrev}
        disabled={disabledPrev}
        aria-label="Página anterior"
      >
        « Anterior
      </button>

      <span className="pager__info" aria-live="polite">
        Página {page + 1} de {pageCount}
      </span>

      <button
        className="btn"
        onClick={onNext}
        disabled={disabledNext}
        aria-label="Página siguiente"
      >
        Siguiente »
      </button>
    </div>
  );
}
