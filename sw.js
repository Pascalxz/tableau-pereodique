/* Service worker : rend l'app installable et utilisable hors-ligne.
   - On précharge la "coquille" (pages + données + icônes) à l'installation.
   - Les MP3 et les polices sont mis en cache au fur et à mesure qu'on les utilise. */
const VERSION = 'v1';
const SHELL   = 'shell-' + VERSION;
const RUNTIME = 'runtime-' + VERSION;

const ASSETS = [
  './', 'index.html', 'base.html', 'avance.html', 'pro.html', 'elements.js',
  'manifest.webmanifest', 'favicon.svg', 'favicon-32.png',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'og-image.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Même origine : cache d'abord, puis réseau (mis en cache pour la prochaine fois).
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME).then(c => { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    );
    return;
  }

  // Autres origines (polices Google) : on sert le cache et on rafraîchit en arrière-plan.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME).then(c => { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
