// frontend/src/App.jsx
import SubscribeButton from './SubscribeButton';
import './App.css';

export default function App() {
  return (
    <div className="App">
      <div style={{ display: 'grid', gap: 20, justifyItems: 'center', marginTop: 40 }}>
        <img src="/vite.svg" alt="vite" width="96" height="96" />
        <img src="/react.svg" alt="react" width="96" height="96" />
        <h1>Lorra News</h1>
        <div className="card">
          <SubscribeButton />
        </div>
      </div>
    </div>
  );
}
