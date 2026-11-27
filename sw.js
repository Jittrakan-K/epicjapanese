/* Kana to N1: เก็บไฟล์ของเว็บไว้ในเครื่อง เปิดได้แม้ไม่มีอินเทอร์เน็ต
   ไฟล์ของเว็บ: ใช้ของในเครื่องก่อนแล้วอัปเดตเบื้องหลัง (stale-while-revalidate)
   หน้าเว็บหลัก: ลองเน็ตก่อน ถ้าไม่มีเน็ตใช้ของในเครื่อง
   ฟอนต์จาก Google: เก็บไว้ครั้งแรกแล้วใช้ของในเครื่อง
   การล็อกอินและซิงก์ (Firebase) ไม่ผ่านไฟล์นี้ */
var VERSION = 'k2n1-v3';
var CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css', 'css/tokens.css',
  'js/app.js', 'js/cloud.js',
  'data/kana.js', 'data/n5.js', 'data/n4.js', 'data/n3.js', 'data/n2.js', 'data/n1.js',
  'data/bank.js', 'data/talk.js', 'data/pitch.js', 'data/gx-a.js', 'data/gx-b.js', 'data/reads.js',
  'data/strokes/kana.json', 'data/strokes/n5.json', 'data/strokes/n4.json',
  'assets/mark.svg', 'assets/icon-192.png', 'assets/apple-touch-icon.png', 'assets/favicon-32.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(new Request(u, { cache: 'reload' })).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function fromCache(req) {
  return caches.match(req).then(function (r) { return r || caches.match(req, { ignoreSearch: true }); });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !fonts) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put('index.html', copy); });
      return res;
    }).catch(function () { return caches.match('index.html', { ignoreSearch: true }); }));
    return;
  }

  if (fonts) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); return res; });
    }));
    return;
  }

  e.respondWith(fromCache(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit && caches.match(req).then(function (exact) { return exact ? hit : net; }) || net;
  }));
});
