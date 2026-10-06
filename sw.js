/* Service worker de Bau Tracker.
   - La app (index.html) se pide PRIMERO A LA RED: si hay internet, siempre abre la última
     versión publicada. Sin internet, abre la copia guardada.
   - Íconos, manifest y librerías de afuera: primero la copia guardada (no cambian).
   - Lo que va a Supabase (cuenta y datos) nunca se guarda acá: pasa directo.
   VERSION la escribe build-web.py con un resumen del contenido: cambia sola en cada versión. */
const VERSION = '894d491a63';
const CACHE = 'bau-tracker-' + VERSION;
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('bau-tracker-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;   // los datos, siempre en vivo

  const esApp = req.mode === 'navigate' || (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));
  if(esApp){
    e.respondWith(
      fetch(req).then(res => {
        if(res.ok){ const copia = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copia)); }
        return res;
      }).catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(guardado => guardado || fetch(req).then(res => {
      if(res.ok || res.type === 'opaque'){ const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }))
  );
});
