// frontend/src/App.jsx
import { useMemo } from 'react';
import SubscribeButton from './SubscribeButton';
import NewsList from './components/NewsList.jsx';
import './App.css';

export default function App() {
  // La base de la API: primero la ENV, si no existe usa el mismo dominio (útil en local)
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_BASE || window.location.origin,
    []
  );

  const permission = typeof Notification !== 'undefined'
    ? Notification.permission
    : 'unsupported';

  return (
    <div className="App">
      <div
        style={{
          display: 'grid',
          gap: 20,
          justifyItems: 'center',
          marginTop: 40,
        }}
      >
        <img src="/vite.svg" alt="vite" width="96" height="96" />
        <img src="/react.svg" alt="react" width="96" height="96" />
        <h1>Lorra News</h1>

        {/* Info rápida */}
        <small style={{ opacity: 0.7 }}>
          Backend: <code>{apiBase}</code>
        </small>
        <small style={{ opacity: 0.7 }}>
          Permiso de notificaciones: <strong>{permission}</strong>
        </small>

        {/* Botón de suscripción */}
        <div className="card">
          <SubscribeButton />
        </div>

        {/* Lista de noticias */}
        <div style={{ width: 'min(900px, 92vw)', marginTop: 8 }}>
          <NewsList />
        </div>
      </div>
    </div>
  );
}
