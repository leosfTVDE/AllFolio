/* TaxFolio Portugal — Service Worker (offline) */
const CACHE = 'taxfolio-v15';
const CORE = ['./', './index.html', './app.html', './manifest.json', './firebase-config.js', './icon-192.png', './icon-512.png'];
const CDN = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Cotações e câmbio: sempre da rede, nunca da cache
  if (url.origin !== location.origin && !CDN.includes(req.url) && !/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
  // Páginas: rede primeiro (para receber atualizações), cache se offline
  if (req.mode === 'navigate' || url.pathname.endsWith('/firebase-config.js')) {
    const isApp = /\/app(\.html)?$/.test(url.pathname);
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? (isApp ? './app.html' : './index.html') : req, cp)); } return r; })
      .catch(() => caches.match(req.mode === 'navigate' ? (isApp ? './app.html' : './index.html') : req)));
    return;
  }
  // Restante: cache primeiro, depois rede (e guarda para a próxima vez)
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
    return r;
  }).catch(() => hit)));
});
