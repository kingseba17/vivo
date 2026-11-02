// VIVO · guarda los archivos en caché para que funcione sin internet.
// Sirve desde la caché y la actualiza por detrás; si cambias la lista de archivos, sube la versión.
const CACHE = 'vivo-v3';
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'js/estrategias.js',
  'js/reglas.js',
  'js/app.js',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const guardado = await cache.match(e.request, { ignoreSearch: true });
      const red = fetch(e.request)
        .then((resp) => { if (resp.ok) cache.put(e.request, resp.clone()); return resp; })
        .catch(() => guardado);
      return guardado || red;
    }),
  );
});
