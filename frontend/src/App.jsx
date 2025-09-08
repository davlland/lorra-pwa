import './App.css';
import SubscribeButton from './SubscribeButton';
import NewsList from './components/NewsList.jsx';

export default function App() {
  const apiBase = import.meta.env.VITE_API_BASE || '(no configurado)';
  return (
    <div className="App" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center', marginTop: 40 }}>
        <img src="/vite.svg" alt="vite" width="96" height="96" />
        <img src="/react.svg" alt="react" width="96" height="96" />
        <h1>Lorra News</h1>

        <p className="muted">Backend: {apiBase.replace(/\/$/, '')}</p>

        <div className="card" style={{ display: 'grid', gap: 12 }}>
          <SubscribeButton />
        </div>
      </div>

      <div className="container">
        <NewsList />
      </div>
    </div>
  );
}
