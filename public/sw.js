// Service worker de Onix Leads.
// Estrategia deliberadamente conservadora: esta app trabaja con datos de
// negocio en vivo (leads, asignaciones, ventas), así que NUNCA cacheamos
// /api/* ni nada relacionado con auth. Solo cacheamos el "app shell"
// estático para que la PWA cargue instantáneamente y funcione offline
// para navegación básica; los datos siempre vienen de la red.

const CACHE_VERSION = "onix-leads-v1";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNeverCached(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__/auth") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("firebaseio.com")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (isNeverCached(url)) return; // deja pasar directo a la red, sin interceptar

  // Estático propio del app shell (mismo origen): cache-first con actualización en segundo plano.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
