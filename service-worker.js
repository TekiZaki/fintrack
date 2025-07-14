// service-worker.js
const CACHE_NAME = "fintrack-cache-v1.1"; // Increment version on new deployment
const urlsToCache = [
  "/",
  "index.html",
  "style.css",
  "fintrack.png",
  "fintrack-512x512.png", // Make sure this file exists or update your manifest/icon strategy
  "js/app.js",
  "auth.js",
  "js/charts.js",
  "js/config.js",
  "js/data.js",
  "js/ui.js",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js",
];

// Install event: Caches all static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return Promise.all(
        urlsToCache.map((url) => {
          return fetch(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch ${url}: ${response.statusText}`
                );
              }
              return cache.put(url, response);
            })
            .catch((error) => {
              console.error(`Failed to cache ${url}:`, error);
            });
        })
      );
    })
  );
});

// Activate event: Cleans up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control of clients immediately upon activation.
  // This helps ensure that subsequent navigations are handled by the new service worker.
  event.waitUntil(self.clients.claim());
});

// Fetch event: Intercepts network requests
self.addEventListener("fetch", (event) => {
  // Check if it's a navigation request (for HTML files)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails for navigation, serve index.html from cache
        return caches.match("index.html");
      })
    );
    return; // Don't cache API requests for navigation
  }

  // For other requests (CSS, JS, images, Chart.js CDN, etc.):
  // Try cache first, then network. If network successful, update cache.
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request to make it usable again
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            // Basic type for same-origin requests, opaque for cross-origin (like CDN)
            // If it's a cross-origin request (like Chart.js CDN), we can't inspect status
            // directly or put in cache unless its an opaque response and we trust it.
            // For robustness, only cache same-origin or known good CDN responses.
            if (event.request.url.startsWith("https://cdnjs.cloudflare.com/")) {
              return response; // Return CDN response directly without caching
            }
            return response; // Return other invalid responses
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and can only be consumed once. We must clone it so that
          // both the browser and the cache can consume it.
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            // Do not cache API requests, as they are dynamic
            if (
              !event.request.url.includes("/api/") &&
              !event.request.url.includes("/data/") &&
              !event.request.url.includes("/auth/") &&
              !event.request.url.includes("/profile/")
            ) {
              cache.put(event.request, responseToCache);
            }
          });

          return response;
        })
        .catch((error) => {
          console.error("Fetch failed:", error);
          // Fallback for when network fails for other resources
          // You could return a specific offline image here for images, etc.
          // For now, if a fetch fails and it's not in cache, the browser will show its default error.
          return new Response("<h1>Offline Content Not Available</h1>", {
            headers: { "Content-Type": "text/html" },
          });
        });
    })
  );
});
