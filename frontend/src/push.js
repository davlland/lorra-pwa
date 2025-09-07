// frontend/src/push.js
// Utilidades para suscripción push en el navegador

const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  (window.__API_BASE__) ||
  window.location.origin; // fallback local

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export async function getVapidPublicKey() {
  const r = await fetch(`${API_BASE}/api/vapidPublicKey`);
  if (!r.ok) throw new Error(`vapidPublicKey ${r.status}`);
  const { key } = await r.json();
  return key;
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) throw new Error('SW no soportado');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribePush() {
  const reg = await registerSW();
  const vapidKey = await getVapidPublicKey();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
  // Guardar sub en la API
  await fetch(`${API_BASE}/api/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub),
  });
  return sub;
}

export async function unsubscribePush() {
  const reg = await registerSW();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe().catch(() => {});
    await fetch(`${API_BASE}/api/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
    return true;
  }
  return false;
}

export async function getSubscription() {
  const reg = await registerSW();
  return reg.pushManager.getSubscription();
}

export const API = API_BASE;
