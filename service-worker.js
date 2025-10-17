const CACHE_NAME = "luxe-war-chest-v1";
const ASSETS = ["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))); });
self.addEventListener("fetch", (e) => { e.respondWith(caches.match(e.request).then(resp => resp || fetch(e.request))); });
