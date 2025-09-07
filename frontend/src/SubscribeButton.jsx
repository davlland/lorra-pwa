// frontend/src/SubscribeButton.jsx
import React, { useEffect, useState } from 'react';
import { subscribePush, unsubscribePush, getSubscription, API } from './push';

export default function SubscribeButton() {
  const [perm, setPerm] = useState(Notification.permission);
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSubscription();
        setSubs(s);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  async function onSubscribe() {
    try {
      setLoading(true);
      if (Notification.permission === 'default') {
        const p = await Notification.requestPermission();
        setPerm(p);
        if (p !== 'granted') return;
      }
      const s = await subscribePush();
      setSubs(s);
    } catch (e) {
      console.error(e);
      alert('Error al suscribirse: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function onUnsubscribe() {
    try {
      setLoading(true);
      await unsubscribePush();
      setSubs(null);
    } catch (e) {
      console.error(e);
      alert('Error al darse de baja: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 16 }}>
      <p>API: <code>{API}</code></p>
      <p>Permiso de notificaciones: <strong>{perm}</strong></p>

      {subs ? (
        <button disabled={loading} onClick={onUnsubscribe} style={{ background:'#c62828', color:'#fff', padding:'8px 14px', borderRadius:8 }}>
          Darse de baja
        </button>
      ) : (
        <button disabled={loading} onClick={onSubscribe} style={{ background:'#1976d2', color:'#fff', padding:'8px 14px', borderRadius:8 }}>
          Permitir notificaciones
        </button>
      )}
    </div>
  );
}
