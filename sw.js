/* ACTool HVAC Service — Service Worker
   ทำให้แอปเปิดใช้งานได้แม้ไม่มีสัญญาณอินเทอร์เน็ต หลังจากเปิดใช้ครั้งแรก
   อัปเดต CACHE_VERSION ทุกครั้งที่แก้ไข index.html เพื่อบังคับดึงไฟล์ใหม่ */
const CACHE_VERSION = 'actool-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.all(
        APP_SHELL.map(url =>
          cache.add(url).catch(() => { /* ไฟล์ใดไฟล์หนึ่งอาจไม่มี (เช่น logo.png) ข้ามไปไม่ให้ install ล้มทั้งหมด */ })
        )
      )
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_VERSION).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

/* กลยุทธ์: network-first สำหรับ index.html (จะได้อัปเดตทันทีเมื่อออนไลน์)
   cache-first สำหรับไฟล์อื่น ๆ (ไอคอน/ฟอนต์ ฯลฯ) เพื่อความเร็ว */
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if(isHTML){
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
