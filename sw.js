const CACHE_NAME='sarah-adventure-v21';
const ASSETS=['./','./index.html','./styles.css','./app.js','./manifest.json','./sw.js','./assets/icon-192.png','./assets/icon-512.png','./assets/cover_clean.png','./assets/sarah_sprites.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
