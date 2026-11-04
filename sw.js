// Service worker sederhana: kerangka aplikasi di-cache, data selalu diambil dari server.
// Ubah nomor versi CACHE di bawah jika ingin memaksa semua perangkat memuat ulang berkas.
const CACHE = 'iwa-hr-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Hanya tangani GET milik situs sendiri. Panggilan API (POST ke Apps Script) dan CDN dibiarkan.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // Halaman utama: utamakan jaringan (agar update langsung terlihat), cache sebagai cadangan.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  // Berkas lain (ikon, manifest): ambil dari cache dulu, perbarui di latar belakang.
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
