// src/SubscribeButton.jsx
import { useEffect, useState } from 'react';
import { subscribeToPush, getCurrentSubscription, unsubscribeFromPush } from './push';

const defaultBackend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function SubscribeButton() {
  const [backendBase] = useState(defaultBackend);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [status, setStatus] = useState(''); // mensajes cortos

  useEffect(() => {
    (async () => {
      const sub = await getCurrentSubscription();
      setIsSubscribed(!!sub);
    })();
  }, []);

  const probarConexion = async () => {
    try {
      const r = await fetch(`${backendBase}/vapidPublicKey`);
      const j = await r.json();
      console.log('[ui] /vapidPublicKey OK:', j);
      alert('Backend OK: clave recibida');
    } catch {
      alert('No se pudo contactar al backend');
    }
  };

  const handleSubscribe = async () => {
    try {
      setStatus('Suscribiendo…');
      await subscribeToPush(backendBase);
      setIsSubscribed(true);
      setStatus('Suscrito ✅');
    } catch (e) {
      console.error(e);
      setStatus('Error: ' + e.message);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setStatus('Dándose de baja…');
      const res = await unsubscribeFromPush(backendBase);
      console.log('[ui] unsubscribe result:', res);
      setIsSubscribed(false);
      setStatus('Baja correcta ✅');
    } catch (e) {
      console.error(e);
      setStatus('Error al darse de baja');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <small>Backend: {backendBase}</small>
      <button onClick={probarConexion}>Probar conexión backend</button>

      {isSubscribed ? (
        <>
          <button onClick={handleUnsubscribe} style={{ background: '#b91c1c' }}>
            Darse de baja
          </button>
          <div>Suscrito ✅ {status && <small>· {status}</small>}</div>
        </>
      ) : (
        <>
          <button onClick={handleSubscribe}>Suscribirme a notificaciones</button>
          <div>{status}</div>
        </>
      )}
    </div>
  );
}
