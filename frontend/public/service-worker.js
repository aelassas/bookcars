const CACHE_PREFIX = 'safarrent-web-shell-'
const CACHE_NAME = `${CACHE_PREFIX}v1`
const SHELL_FILES = ['/', '/manifest.webmanifest', '/safarrent-mark.svg', '/safarrent-app-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
return
}

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone()))
}
        return response
      }).catch(async () => (await caches.match(request)) || (await caches.match('/'))),
    )
    return
  }

  const isAppAsset = /^\/(assets|chunks|entries)\//.test(url.pathname)
    || /\.(js|css|woff2?|svg|png)$/i.test(url.pathname)
  if (!isAppAsset) {
return
}

  event.respondWith(
    fetch(request).then((response) => {
        if (response.ok) {
caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
}
        return response
      }).catch(async () => caches.match(request)),
  )
})
