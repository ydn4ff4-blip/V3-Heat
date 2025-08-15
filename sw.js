
const CACHE = 'heatpro-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './manifest.webmanifest',
  './icons/icon-72x72.png','./icons/icon-96x96.png','./icons/icon-128x128.png',
  './icons/icon-144x144.png','./icons/icon-152x152.png','./icons/icon-192x192.png',
  './icons/icon-384x384.png','./icons/icon-512x512.png'
];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
    const copy = res.clone();
    caches.open(CACHE).then(c=>c.put(e.request, copy));
    return res;
  })));
});
