// frontend/src/SubscribeButton.jsx
import { useEffect, useState } from 'react';
import {
  API_BASE_FOR_UI,
  registerSW,
  getExistingSubscription,
  subscribe,
  unsubscribe,
  testPush,
  notifyLatest,
  getStatus,
} from './push';

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [perm, setPerm] = useState(Notification?.permission || 'default');
  const [status, setStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const reg = await registerSW();
        const sub = await getExistingSubscription(reg);
        setSubscribed(!!sub);
      } catch (e) {
        console.error(e);
      }
    })();
    setPerm(Notification?.permission || 'default');
  }, []);

  async function handleSubscribe() {
    try {
      setLoading(true);
      await subscribe();
      setSubscribed(true);
      setPerm(Notification.permission);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsubscribe() {
    try {
      setLoading(true);
      await unsubscribe();
      setSubscribed(false);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTest() {
    try {
      setLoading(true);
      const r = await testPush();
      console.log(r);
      alert(`Test enviado. OK=${r.ok}, sent=${r.sent}`);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleNotifyLatest(force = false) {
    try {
      setLoading(true);
      const r = await notifyLatest(force);
      console.log(r);
      alert(JSON.stringify(r));
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatus() {
    try {
      const r = await getStatus();
      setStatus(r);
      console.log(r);
      alert('Mira la consola (status)');
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
      <small>Backend: {API_BASE_FOR_UI}</small>
      <small>Permiso de notificaciones: <b>{perm}</b></small>

      {!subscribed ? (
        <button disabled={loading} onClick={handleSubscribe}>
          {loading ? '...' : 'Suscribirme a notificaciones'}
        </button>
      ) : (
        <>
          <div style={{ color: '#0f0' }}>Suscrito ✅</div>
          <button disabled={loading} onClick={handleUnsubscribe} style={{ background: '#c92424', color: '#fff' }}>
            {loading ? '...' : 'Darse de baja'}
          </button>
        </>
      )}

      <hr style={{ width: 240, opacity: 0.3 }} />

      <button disabled={loading} onClick={handleTest}>Probar notificación (test-push)</button>
      <button disabled={loading} onClick={() => handleNotifyLatest(false)}>Notificar última noticia</button>
      <button disabled={loading} onClick={() => handleNotifyLatest(true)}>Notificar (force=1)</button>
      <button onClick={handleStatus}>/status</button>

      {status && (
        <pre style={{ textAlign: 'left', maxWidth: 600, overflow: 'auto', background: '#111', padding: 10 }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </div>
  );
}
