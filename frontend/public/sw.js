// frontend/public/sw.js
// Service Worker para notificaciones push

self.addEventListener('install', (event) => {
  // Activa inmediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Toma control de las páginas abiertas
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Noticia';
    const body = data.body || '';
    const url = data.url || '/';

    const options = {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      data: { url },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    // fallback si no viene JSON
    event.waitUntil(
      self.registration.showNotification('Noticia', {
        body: event.data ? event.data.text() : '',
        icon: '/icon-192x192.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una pestaña abierta, enfócala
      for (const client of clientList) {
        const u = new URL(client.url);
        if (client.visibilityState === 'visible') {
          return client.focus();
        }
      }
      // Si no, abre una nueva
      return clients.openWindow(url);
    })
  );
});
