import './App.css';
import SubscribeButton from './SubscribeButton';
import NewsList from './components/NewsList.jsx';

export default function App() {
  return (
    <div className="App">
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center', marginTop: 40 }}>
        <img src="/vite.svg" alt="vite" width="96" height="96" />
        <img src="/react.svg" alt="react" width="96" height="96" />
        <h1>Lorra News</h1>

        {/* Suscripción push */}
        <div className="card" style={{ width: '100%', maxWidth: 520 }}>
          <SubscribeButton />
        </div>

        {/* Lista de noticias */}
        <div style={{ width: '100%', maxWidth: 920 }}>
          <NewsList />
        </div>
      </div>
    </div>
  );
}
