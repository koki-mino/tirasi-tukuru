const CACHE = "manabi-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./data/places.geojson",
  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
