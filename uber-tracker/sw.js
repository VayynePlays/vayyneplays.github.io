const CACHE_NAME = 'uber-tracker-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.map(n => n !== CACHE_NAME ? caches.delete(n) : null))
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => 
      response || fetch(e.request)
    )
  );
});
