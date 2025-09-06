// src/push.js
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(backendBase = 'http://localhost:3001') {
  if (!('serviceWorker' in navigator)) throw new Error('SW no soportado');
  if (Notification.permission !== 'granted') throw new Error('Notificaciones no permitidas');

  const reg = await navigator.serviceWorker.ready;
  // si ya existe, la reusamos
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const { key } = await fetch(`${backendBase}/vapidPublicKey`).then(r => r.json());
    const appServerKey = urlBase64ToUint8Array(key);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey
    });
  }

  // guarda en backend/Firestore
  await fetch(`${backendBase}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub)
  });

  return sub;
}

export async function getCurrentSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function unsubscribeFromPush(backendBase = 'http://localhost:3001') {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true, removedLocal: false, removedRemote: false };

  // guardamos endpoint para borrar en Firestore
  const endpoint = sub.endpoint;

  // 1) borrar en el navegador
  const removedLocal = await sub.unsubscribe().catch(() => false);

  // 2) avisar al backend para borrar en Firestore (aunque falle el 1)
  let removedRemote = false;
  try {
    await fetch(`${backendBase}/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint })
    }).then(r => r.json());
    removedRemote = true;
  } catch (e) {
    removedRemote = false;
  }

  return { ok: removedLocal || removedRemote, removedLocal, removedRemote };
}
