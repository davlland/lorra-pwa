// frontend/src/push.js
// Utilidades de Push + llamadas a la API usando VITE_API_BASE

// --------------- Config API ----------------
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, ''); // p.ej. https://lorra-api.vercel.app

function api(path) {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE) {
    // fallback al mismo origin si no tienes VITE_API_BASE (no recomendado en prod)
    return `${location.origin}/api${clean}`;
  }
  return `${API_BASE}/api${clean}`;
}

// --------------- Helpers -------------------
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replaceAll(/-/g, '+')
    .replaceAll(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// --------------- API calls -----------------
export async function getVapidPublicKey() {
  const r = await fetch(api('/vapidPublicKey'));
  if (!r.ok) throw new Error('GET /vapidPublicKey failed');
  const { key } = await r.json();
  if (!key) throw new Error('VAPID key missing');
  return key;
}

export async function subscribeOnServer(subscription) {
  const r = await fetch(api('/subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  if (!r.ok) throw new Error('POST /subscribe failed');
  return r.json();
}

export async function unsubscribeOnServer(endpoint) {
  const r = await fetch(api('/unsubscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
  if (!r.ok) throw new Error('POST /unsubscribe failed');
  return r.json();
}

export async function testPush() {
  const r = await fetch(api('/test-push'), { method: 'POST' });
  if (!r.ok) throw new Error('POST /test-push failed');
  return r.json();
}

export async function notifyLatest(force = false) {
  const r = await fetch(api(`/notify-latest?force=${force ? 1 : 0}`), { method: 'POST' });
  if (!r.ok) throw new Error('POST /notify-latest failed');
  return r.json();
}

export async function getStatus() {
  const r = await fetch(api('/status'));
  return r.json();
}

// --------------- SW + Push -----------------
export async function registerSW() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker no soportado');
  // sw.js debe estar en /public para que se sirva en la raíz
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

export async function ensurePermission() {
  if (!('Notification' in window)) throw new Error('Notifications no soportado');
  if (Notification.permission === 'granted') return 'granted';
  const p = await Notification.requestPermission();
  return p;
}

export async function getExistingSubscription(registration) {
  return await registration.pushManager.getSubscription();
}

export async function subscribe() {
  const reg = await registerSW();
  const perm = await ensurePermission();
  if (perm !== 'granted') throw new Error('Permiso de notificaciones denegado');

  const vapidKey = await getVapidPublicKey();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  await subscribeOnServer(sub.toJSON());
  return sub;
}

export async function unsubscribe() {
  const reg = await registerSW();
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true, already: true };

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await unsubscribeOnServer(endpoint);
  return { ok: true };
}

// --------------- Exponer base de API en UI ---------------
export const API_BASE_FOR_UI = API_BASE || '(same origin)';
