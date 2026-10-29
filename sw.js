// App shell offline: network first (3 s timeout), cache as fallback. GitHub API calls are not touched.
const CACHE = "preseason-v2.2.0";
const SHELL = ["./", "index.html", "styles.css", "app.js", "store.js", "plan.js", "manifest.webmanifest", "keepawake.mp4", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.headers.has("range")) { e.respondWith(rangeFromCache(req)); return; }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? cache.match("index.html") : Response.error());
    }
  })());
});

// Safari asks for the video in byte ranges: answer from the cached copy so it works offline too.
async function rangeFromCache(req) {
  const cache = await caches.open(CACHE);
  const res = await cache.match(req, { ignoreSearch: true });
  if (!res) return fetch(req);
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range")) || [];
  const start = +m[1] || 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": res.headers.get("Content-Type") || "video/mp4",
    "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
    "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}
