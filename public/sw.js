const CACHE_NAME = "medivision-v1.0.0";
const OFFLINE_URL = "/offline.html";

// Core files to cache immediately
const CORE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/_next/static/css/app/globals.css",
  "/icon-192.png",
  "/icon-512.png",
];

// API routes to cache strategically
const API_CACHE_PATTERNS = [
  /^\/api\/health-check/,
  /^\/api\/analyze-image/,
  /^\/api\/analyze-audio/,
  /^\/api\/chat/,
];

// Install event - cache core assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching core assets");
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log("[SW] Core assets cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Failed to cache core assets:", error);
      })
  );
});

// Push notification event handler
self.addEventListener("push", (event) => {
  console.log("[SW] Push message received");

  let notificationData = {
    title: "MediVision Assistant",
    body: "You have a new health reminder",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: "/",
    },
    actions: [
      {
        action: "open",
        title: "Open App",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error("[SW] Error parsing push data:", error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: true,
      tag: "medivision-notification",
    })
  );
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked");

  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - handle requests with different strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle other requests with network-first strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle API requests with network-first, cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Emergency and critical health APIs - always try network first
  if (
    url.pathname.includes("emergency") ||
    url.pathname.includes("live-chat") ||
    API_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))
  ) {
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.status === 200) {
        // Cache successful API responses for 5 minutes
        const responseClone = networkResponse.clone();
        const cache = await caches.open(CACHE_NAME);

        // Add expiration timestamp
        const cachedResponse = {
          response: responseClone,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000, // 5 minutes
        };

        await cache.put(
          request.url + "_timestamped",
          new Response(JSON.stringify(cachedResponse), {
            headers: { "Content-Type": "application/json" },
          })
        );

        await cache.put(request, responseClone);
      }

      return networkResponse;
    } catch (error) {
      console.log("[SW] Network failed, trying cache for API:", url.pathname);

      // Try to get cached version
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      if (cached) {
        console.log("[SW] Serving cached API response");
        return cached;
      }

      // Return offline response for critical APIs
      return new Response(
        JSON.stringify({
          error: "Network unavailable",
          offline: true,
          message:
            "This feature requires internet connection. Please check your connection and try again.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Non-critical APIs - just try network
  return fetch(request);
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    // Serve from cache immediately
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {}); // Update cache in background, ignore errors

    return cached;
  }

  // Not in cache, fetch and cache
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log("[SW] Failed to fetch static asset:", request.url);
    // Return a placeholder or cached offline asset if available
    return new Response("Asset unavailable offline", { status: 503 });
  }
}

// Background sync for health data
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "health-data-sync") {
    event.waitUntil(syncHealthData());
  }
});

// Sync health data when back online
async function syncHealthData() {
  try {
    // Get pending health records from IndexedDB or localStorage
    const pendingRecords = await getPendingHealthRecords();

    for (const record of pendingRecords) {
      try {
        await fetch("/api/sync-health-record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });

        // Remove from pending after successful sync
        await removePendingRecord(record.id);
        console.log("[SW] Synced health record:", record.id);
      } catch (error) {
        console.error("[SW] Failed to sync record:", record.id, error);
      }
    }
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// Placeholder functions for health data sync
async function getPendingHealthRecords() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

async function removePendingRecord(id) {
  // In a real implementation, this would remove from IndexedDB
  console.log("[SW] Would remove pending record:", id);
}

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  const options = {
    body: "MediVision has important health information for you",
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    tag: "health-notification",
    requireInteraction: true,
    actions: [
      {
        action: "view",
        title: "View Details",
        icon: "/icon-72.png",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("MediVision Alert", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  event.notification.close();

  if (event.action === "view") {
    event.waitUntil(self.clients.openWindow("/"));
  }
});
