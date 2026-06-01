/* Service worker : rend l'app installable et utilisable hors-ligne.
   Stratégie :
   - HTML et JS (même origine) → RÉSEAU D'ABORD : on a toujours la dernière
     version quand on est en ligne ; repli sur le cache si hors-ligne.
   - Images, sons (MP3), polices → CACHE D'ABORD : rapides et hors-ligne.
   La "coquille" est préchargée à l'installation. */
const VERSION = 'v3';
const SHELL   = 'shell-' + VERSION;
const RUNTIME = 'runtime-' + VERSION;

const ASSETS = [
  './', 'index.html', 'base.html', 'avance.html', 'pro.html', 'elements.js', 'quiz.js',
  'manifest.webmanifest', 'favicon.svg', 'favicon-32.png',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'og-image.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putRuntime(req, res) {
  const copy = res.clone();
  caches.open(RUNTIME).then(c => { try { c.put(req, copy); } catch (_) {} });
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // HTML & JS de l'app : réseau d'abord (toujours frais), repli cache.
  const isAppCode = sameOrigin && (req.mode === 'navigate' ||
    url.pathname.endsWith('.html') || url.pathname.endsWith('.js'));
  if (isAppCode) {
    e.respondWith(
      fetch(req).then(res => putRuntime(req, res))
        .catch(() => caches.match(req).then(hit => hit || caches.match('index.html')))
    );
    return;
  }

  // Autres ressources même origine (sons, icônes, manifest) : cache d'abord.
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => putRuntime(req, res)).catch(() => Response.error()))
    );
    return;
  }

  // Cross-origin (polices Google) : on sert le cache et on rafraîchit derrière.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => putRuntime(req, res)).catch(() => hit);
      return hit || net;
    })
  );
});
