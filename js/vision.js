// カメラと3つのモデル。
//  ・手（MediaPipe Hand Landmarker）… 掲げる合図
//  ・顔の位置（MediaPipe Face Detector＝BlazeFace）… 磨いている間の顔。口もとが隠れても落ちにくい
//  ・顔の見分け（face-api の 128 次元）… 「だれかな？」と登録の時だけ回す（重いので）
// 推論はすべて端末の中。MediaPipe は既定で Google へ使用ログを送ろうとするが、index.html の CSP で塞いでいる。
import { FilesetResolver, HandLandmarker, FaceDetector } from '../vendor/vision_bundle.mjs';
import * as faceapi from '../vendor/faceapi/face-api.esm.js';

export const video = document.createElement('video');
video.setAttribute('playsinline', '');
video.muted = true;
video.autoplay = true;

let hands = null, faces = null, faceapiReady = false;
let lastTs = -1;

// 取得中に2回呼ばれたら同じ約束を返す。取得中に止められたら、届いたカメラはその場で止めて捨てる
//（2026-11-04 紫穂・葵：画面を素早く渡ると2本目が点きっぱなし／タイトルでカメラが点く恐れ）
let camGen = 0, camPending = null, camPendingGen = -1;
export function startCamera() {
  if (video.srcObject) return Promise.resolve();
  // 取得中の分が止められた後（古い世代）なら、それが片付いてから取り直す
  if (camPending) return camPendingGen === camGen ? camPending : camPending.then(() => startCamera());
  const gen = camGen;
  camPendingGen = gen;
  camPending = (async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (gen !== camGen) { stream.getTracks().forEach(tr => tr.stop()); return; }
      video.srcObject = stream;
      try {
        await video.play();
        await new Promise(r => (video.videoWidth ? r() : video.addEventListener('loadedmetadata', r, { once: true })));
      } catch (e) {
        // 再生が始まる前に止められた（素早く戻った）だけなら失敗にしない（2026-11-04 紫穂：エラー箱が出た）
        if (gen !== camGen && e && e.name === 'AbortError') return;
        throw e;
      }
    } finally {
      camPending = null;
    }
  })();
  return camPending;
}

async function withFallback(make) {
  try { return await make('GPU'); }
  catch (e) { console.warn('GPU で作れなかったので CPU にします', e); return make('CPU'); }
}

export function stopCamera() {
  camGen++;                      // 取得中の分も止める
  const st = video.srcObject;
  if (!st) return;
  st.getTracks().forEach(tr => tr.stop());
  video.srcObject = null;
}

export async function loadModels(onStep = () => {}) {
  const fileset = await FilesetResolver.forVisionTasks('vendor/wasm');
  onStep(1);
  hands = await withFallback(delegate => HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: 'models/hand_landmarker.task', delegate },
    runningMode: 'VIDEO', numHands: 2,
    minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  }));
  onStep(2);
  faces = await withFallback(delegate => FaceDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: 'models/blaze_face_short_range.tflite', delegate },
    runningMode: 'VIDEO', minDetectionConfidence: 0.6,
  }));
  onStep(3);
  await faceapi.nets.tinyFaceDetector.loadFromUri('models/faceapi');
  await faceapi.nets.faceLandmark68Net.loadFromUri('models/faceapi');
  await faceapi.nets.faceRecognitionNet.loadFromUri('models/faceapi');
  faceapiReady = true;
  onStep(4);
}

function nextTs() {
  let ts = performance.now();
  if (ts <= lastTs) ts = lastTs + 1;
  lastTs = ts;
  return ts;
}

// 1コマぶんの手と顔（正規化座標、鏡像にする前）
// prefer: 前のコマの顔の中心 {x, y}。複数の顔が映ったら、これに近い顔を選ぶ（途中で人が入れ替わらない）
export function detectFrame(prefer) {
  if (!hands || !faces || video.readyState < 2) return { face: null, hands: [], faceCount: 0 };
  const ts = nextTs();
  const W = video.videoWidth, H = video.videoHeight;
  let handRes, faceRes;
  try { handRes = hands.detectForVideo(video, ts); } catch (e) { handRes = null; }
  try { faceRes = faces.detectForVideo(video, ts); } catch (e) { faceRes = null; }

  const handList = (handRes?.landmarks ?? []).map(pts => ({ pts: pts.map(p => ({ x: p.x, y: p.y })) }));

  const dets = (faceRes?.detections ?? []).map(d => {
    const b = d.boundingBox;
    const kp = d.keypoints ?? [];
    return {
      top: b.originY / H, bottom: (b.originY + b.height) / H,
      left: b.originX / W, w: b.width / W, cx: (b.originX + b.width / 2) / W, cy: (b.originY + b.height / 2) / H,
      mouth: kp[3] ? { x: kp[3].x, y: kp[3].y } : null,
      area: b.width * b.height,
    };
  });
  let face = null;
  if (dets.length) {
    if (prefer) face = dets.reduce((a, b) => (Math.hypot(a.cx - prefer.x, a.cy - prefer.y) <= Math.hypot(b.cx - prefer.x, b.cy - prefer.y) ? a : b));
    else face = dets.reduce((a, b) => (a.area >= b.area ? a : b));
  }
  return { face, hands: handList, faceCount: dets.length };
}

// 顔の見分け用の数値。いちばん大きい顔1つ。顔が無ければ null、2人以上なら { many: true }
export async function describeFace() {
  if (!faceapiReady || video.readyState < 2) return null;
  // 小さい顔検出は入力の大きさで見落とし方が変わる（試験の写真で 320 は 0 件・416 は 0.95）。
  // 見つかるまで大きさを変えて最大3回
  let all = [];
  for (const [inputSize, scoreThreshold] of [[416, 0.4], [320, 0.35], [608, 0.35]]) {
    all = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold }))
      .withFaceLandmarks().withFaceDescriptors();
    if (all.length) break;
  }
  if (!all.length) return null;
  const big = all.slice().sort((a, b) => b.detection.box.area - a.detection.box.area);
  // 2番目の顔が1番目の半分より大きければ「2人いる」とみなす
  if (big.length > 1 && big[1].detection.box.area > big[0].detection.box.area * 0.5) return { many: true };
  const box = big[0].detection.box;
  return {
    desc: big[0].descriptor,
    box: { x: box.x / video.videoWidth, y: box.y / video.videoHeight, w: box.width / video.videoWidth, h: box.height / video.videoHeight },
  };
}

// 照合。各人の登録の中で近い3枚の平均距離を比べる
//  sure：最良 < STRICT かつ 2位との差 > MARGIN → 「◯◯さん？」を1人だけ出す
//  候補：最良 < LOOSE → 近い順に3人まで出して選んでもらう
export const MATCH = { STRICT: 0.5, MARGIN: 0.1, LOOSE: 0.6 };
export function matchPeople(desc, people) {
  const scored = people.map(p => {
    const ds = p.descs.map(d => faceapi.euclideanDistance(desc, d)).sort((a, b) => a - b).slice(0, 3);
    return { person: p, d: ds.length ? ds.reduce((s, v) => s + v, 0) / ds.length : 9 };
  }).sort((a, b) => a.d - b.d);
  const best = scored[0], second = scored[1];
  const sure = !!best && best.d < MATCH.STRICT && (!second || second.d - best.d > MATCH.MARGIN);
  return { sure, ranked: scored.filter(s => s.d < MATCH.LOOSE).slice(0, 3) };
}
