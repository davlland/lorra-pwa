

import SubscribeButton from './components/SubscribeButton';
import NewsList from './components/NewsList';

export default function App(){
  return (
    <div className="container">
      <div className="logoRow">
        <img src="/vite.svg" alt="vite" width="96" height="96" />
        <img src="/react.svg" alt="react" width="96" height="96" />
        <h1 className="headline">Lorra News</h1>
      </div>

      {/* Backend info (opcional) */}
      <div className="inlineNote subtle">
        Backend: https://lorra-api.vercel.app
      </div>

      {/* Suscripción push */}
      <div className="card" style={{ maxWidth: 520 }}>
        <SubscribeButton />
      </div>

      {/* Lista de noticias */}
      <div style={{ width: '100%', maxWidth: 920, marginTop: 16 }}>
        <NewsList />
      </div>
    </div>
  );
}
