/* ============================================================
   SERVICE WORKER — minimal, app-shell uniquement
   Ne met en cache QUE les fichiers statiques de l'application
   (HTML, manifest, icônes). Toute requête vers Firestore, Firebase
   Auth ou les CDN Firebase/gstatic passe directement par le réseau :
   la synchronisation temps réel n'est jamais servie depuis le cache.
   ============================================================ */
const CACHE_NAME = "nos-idees-creatives-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.error("Mise en cache initiale impossible :", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // On ne touche qu'aux requêtes GET de même origine (le shell de l'app).
  // Tout le reste (Firestore, Auth Google, gstatic...) suit son chemin normal.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Stratégie "stale-while-revalidate" : réponse immédiate depuis le cache
  // si disponible, tout en rafraîchissant le cache en arrière-plan.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
