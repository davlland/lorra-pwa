// public/sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => clients.claim());

self.addEventListener('push', (event) => {
  // No muestres notis si el usuario no dio permiso
  if (Notification.permission !== 'granted') return;

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    try {
      data = { title: 'Mensaje', body: event.data?.text() };
    } catch {
      data = { title: 'Mensaje', body: '' };
    }
  }

  const title = data.title || 'Nueva noticia';
  const options = {
    body: data.body || '',
    data: { url: data.url || '/' },
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
