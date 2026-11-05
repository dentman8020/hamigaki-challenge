// https で置いた時だけ使う。1回開けば、あとは電波が無くても動くように一式を端末に控える。
// 中身を変えたら VERSION を上げる（古い控えが消える）。
const VERSION = 'v8-20261105';   // app.js の APP_VERSION と一緒に上げる
const FILES = [
  './', 'index.html', 'NOTICE.txt',
  'vendor/licenses/MediaPipe_Apache-2.0.txt', 'vendor/licenses/face-api_MIT.txt', 'vendor/licenses/OFL_NotoSansKhmer.txt', 'vendor/licenses/OFL_Baloo2.txt', 'css/style.css', 'css/fonts.css',
  'vendor/fonts/Baloo2-600-latin.woff2', 'vendor/fonts/Baloo2-800-latin.woff2',
  'vendor/fonts/NotoSansKhmer-500-khmer.woff2', 'vendor/fonts/NotoSansKhmer-800-khmer.woff2',
  'vendor/fonts/NotoSansKhmer-500-latin.woff2', 'vendor/fonts/NotoSansKhmer-800-latin.woff2', 'manifest.webmanifest', 'assets/icon.svg',
  'js/app.js', 'js/i18n.js', 'js/store.js', 'js/gesture.js', 'js/vision.js',
  'vendor/vision_bundle.mjs', 'vendor/faceapi/face-api.esm.js',
  'vendor/wasm/vision_wasm_internal.js', 'vendor/wasm/vision_wasm_internal.wasm',
  'vendor/wasm/vision_wasm_nosimd_internal.js', 'vendor/wasm/vision_wasm_nosimd_internal.wasm',
  'assets/chara/dentman_raise.png', 'assets/chara/dentman_brush.png', 'assets/chara/dentman_cheer.png', 'assets/chara/dentman_point.png',
  'assets/chara/mutans_normal.png', 'assets/chara/mutans_weak.png', 'assets/chara/mutans_defeated.png',
  'assets/chara/dentman_cheer_a.png', 'assets/chara/dentman_cheer_b.png', 'assets/chara/dentman_wave_a.png', 'assets/chara/dentman_wave_b.png', 'assets/chara/dentman_raise_v2.png', 'assets/chara/mutans_hp4.png', 'assets/chara/mutans_hp3.png', 'assets/chara/mutans_hp2.png', 'assets/chara/mutans_hp1.png', 'assets/chara/mutans_hp0.png',
  'models/hand_landmarker.task', 'models/blaze_face_short_range.tflite',
  'models/faceapi/tiny_face_detector_model-weights_manifest.json', 'models/faceapi/tiny_face_detector_model.bin',
  'models/faceapi/face_landmark_68_model-weights_manifest.json', 'models/faceapi/face_landmark_68_model.bin',
  'models/faceapi/face_recognition_model-weights_manifest.json', 'models/faceapi/face_recognition_model.bin',
];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
