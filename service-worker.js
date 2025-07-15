const CACHE_NAME = "fintrack-cache-v2";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./fintrack.png",
  "./fintrack-512x512.png",
  "./fin.png",
  "./js/config.js",
  "./js/data.js",
  "./js/ui.js",
  "./js/charts.js",
  "./js/app.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js",
];

// Install event: open a cache and add the app shell files to it
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event: serve cached content when offline
self.addEventListener("fetch", (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== "GET") {
    return;
  }

  // For API calls, always fetch from the network.
  // For other requests (app shell), use a cache-first strategy.
  const isApiRequest =
    event.request.url.includes("/data/") ||
    event.request.url.includes("/profile/") ||
    event.request.url.includes("/auth/");

  if (isApiRequest) {
    // For API requests, try network first. Don't cache API responses.
    event.respondWith(fetch(event.request));
  } else {
    // For app shell assets, use Cache-First strategy.
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Clone and cache the valid response
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      })
    );
  }
});

// Activate event: remove old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
