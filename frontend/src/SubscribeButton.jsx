import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE; // p. ej. https://lorra-api.vercel.app

function b64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function SubscribeButton() {
  const [perm, setPerm] = useState(Notification.permission);         // 'default' | 'granted' | 'denied'
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  const backendInfo = useMemo(() => {
    try {
      const u = new URL(API_BASE);
      return `Backend: ${u.origin}`;
    } catch {
      return `Backend: ${API_BASE}`;
    }
  }, []);

  useEffect(() => {
    setPerm(Notification.permission);

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(s => setSubscribed(Boolean(s)))
      .catch(() => {});
  }, []);

  async function ensurePermission() {
    if (Notification.permission !== 'granted') {
      const res = await Notification.requestPermission();
      setPerm(res);
      if (res !== 'granted') throw new Error('Permiso de notificaciones no concedido.');
    }
  }

  async function subscribe() {
    try {
      setBusy(true);
      await ensurePermission();

      const reg = await navigator.serviceWorker.ready;

      // 1) obtener VAPID pública
      const r = await fetch(`${API_BASE}/api/vapidPublicKey`);
      const { key } = await r.json();

      // 2) subscribirse en el navegador
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToUint8Array(key),
      });

      // 3) guardar en backend
      await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub),
      });

      setSubscribed(true);
    } catch (e) {
      alert(e.message || 'Error al suscribirse');
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    try {
      setBusy(true);
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setSubscribed(false);
        return;
      }

      // avisar al backend para borrar
      await fetch(`${API_BASE}/api/unsubscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });

      await sub.unsubscribe();
      setSubscribed(false);
    } catch (e) {
      alert(e.message || 'Error al darse de baja');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}>
      <small style={{ opacity: .7 }}>{backendInfo}</small>
      <div style={{ fontSize: 14, opacity: .8 }}>
        Permiso de notificaciones: <strong>{perm}</strong>
      </div>

      {!subscribed ? (
        <button
          onClick={subscribe}
          disabled={busy}
          style={{
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid #555',
            background: '#222',
            color: '#fff',
            cursor: busy ? 'not-allowed' : 'pointer'
          }}
        >
          {busy ? '…' : 'Suscribirme'}
        </button>
      ) : (
        <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
          <div style={{ color: '#4ade80', fontWeight: 600 }}>
            ✓ Suscrito
          </div>
          <button
            onClick={unsubscribe}
            disabled={busy}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              background: '#b91c1c',
              color: '#fff',
              border: 'none',
              cursor: busy ? 'not-allowed' : 'pointer'
            }}
          >
            {busy ? '…' : 'Darse de baja'}
          </button>
        </div>
      )}
    </div>
  );
}
