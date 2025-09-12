import { useEffect, useMemo, useState } from 'react';
import './SubscribeButton.css';

const API_BASE = import.meta.env.VITE_API_BASE; // p. ej. https://lorra-api.vercel.app

function b64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function SubscribeButton() {
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
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
    if (typeof Notification !== 'undefined') {
      setPerm(Notification.permission);
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => setSubscribed(Boolean(s)))
      .catch(() => {});
  }, []);

  async function ensurePermission() {
    if (typeof Notification === 'undefined') {
      throw new Error('Notifications no soportadas en este navegador.');
    }
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
      if (!r.ok) throw new Error('No se pudo obtener la clave VAPID pública');
      const { key } = await r.json();

      // 2) subscribirse en el navegador
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToUint8Array(key),
      });

      // 3) guardar en backend (aceptamos body plano o { subscription })
      const s = await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });
      if (!s.ok) throw new Error('No se pudo registrar la suscripción en la API');

      setSubscribed(true);
    } catch (e) {
      alert(e?.message || 'Error al suscribirse');
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
      }).catch(() => {});

      await sub.unsubscribe().catch(() => {});
      setSubscribed(false);
    } catch (e) {
      alert(e?.message || 'Error al darse de baja');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="subsCard">
      <small className="muted">{backendInfo}</small>
      <div className="muted">
        Permiso de notificaciones: <strong>{perm}</strong>
      </div>

      {!subscribed ? (
        <div className="actions">
          <button
            className="btn btn--primary"
            onClick={subscribe}
            disabled={busy}
            aria-busy={busy ? 'true' : 'false'}
          >
            {busy ? '…' : 'Suscribirme'}
          </button>
        </div>
      ) : (
        <>
          <div className="muted">✓ Suscrito</div>
          <div className="actions">
            <button
              className="btn"
              onClick={unsubscribe}
              disabled={busy}
              aria-busy={busy ? 'true' : 'false'}
              title="Cancelar suscripción"
            >
              {busy ? '…' : 'Darse de baja'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
