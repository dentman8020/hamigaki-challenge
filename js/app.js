// 画面の行き来と、各画面の動き。
import { LANGS, setLang, getLang, t, num, fmtDuration, fmtClock, applyI18n } from './i18n.js';
import { store, summary, askPersist } from './store.js';
import { RaiseTimer, CFG } from './gesture.js';

const $ = id => document.getElementById(id);
const APP_VERSION = 'v8 (2026-11-05)';   // sw.js の VERSION と一緒に上げる
const GOAL_MS = 3 * 60 * 1000;   // めやす3分（星3つ）
const REG_SHOTS = 6;             // 登録で集める顔の枚数

let vision = null;               // 読み込みが終わるまで null
let current = null;              // いま磨く人
let loopId = 0;                  // 画面ごとのループを止めるための番号

// 次のコマ。描画の更新（requestAnimationFrame）が止まる場面（画面が裏に回る等）でも
// 計測が止まらないよう、タイマーとの早い方で進める
function nextFrame(fn) {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  requestAnimationFrame(run);
  setTimeout(run, 100);
}

// ---------- 音（ピコッ） ----------
let actx = null;
function beep(freqs, dur = 0.12) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    let at = actx.currentTime;
    for (const f of freqs) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.25, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(actx.destination); o.start(at); o.stop(at + dur + 0.02);
      at += dur * 0.9;
    }
  } catch { /* 音が出なくても続ける */ }
}
const SND = { armed: () => beep([660, 880]), start: () => beep([523, 659, 784], 0.14), end: () => beep([784, 988, 1175, 1568], 0.16), ok: () => beep([880], 0.08) };

// ---------- 画面の切り替え ----------
const screens = ['title', 'how', 'who', 'reg', 'brush', 'result', 'records'];
const CAMERA_SCREENS = ['how', 'who', 'reg', 'brush'];
let screenNow = 'title';
function go(name) {
  screenNow = name;
  loopId++;                      // 前の画面のループを止める
  releaseWake();
  screens.forEach(s => $('s-' + s).classList.toggle('on', s === name));
  if (!CAMERA_SCREENS.includes(name)) vision?.stopCamera();   // カメラのランプを点けたままにしない
  ({ title: enterTitle, how: enterHow, who: enterWho, reg: enterReg, brush: enterBrush, records: enterRecords }[name] || (() => {}))();
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

// ---------- 準備（カメラとモデル。最初の1回だけ） ----------
let readyPromise = null;
function ensureReady() {
  // 2回目からはモデルは読み込み済み。止めたカメラだけ点け直す
  if (readyPromise && vision) return readyPromise.then(cameraForScreen).catch(e => { showError(t('camError')); throw e; });
  if (!readyPromise) {
    readyPromise = (async () => {
      $('loading').classList.remove('hidden');
      const bar = $('loadBar');
      try {
        vision = await import('./vision.js');
        bar.style.width = '10%';
        await vision.startCamera();
        bar.style.width = '25%';
        await vision.loadModels(step => { bar.style.width = (25 + step * 18.75) + '%'; });
        if (!CAMERA_SCREENS.includes(screenNow)) vision.stopCamera();   // 読み込み中に画面を離れていたら止める
        askPersist();
      } catch (e) {
        console.error(e);
        readyPromise = null;
        const cam = e && (e.name === 'NotAllowedError' || e.name === 'NotFoundError' || e.name === 'NotReadableError' || e.name === 'SecurityError');
        showError(cam ? t('camError') : `${t('modelError')}（${e?.message || e}）`);
        throw e;
      } finally {
        $('loading').classList.add('hidden');
      }
    })();
  }
  return readyPromise;
}
// 今の画面がカメラを使う時だけ点ける。点いた後に画面が変わっていたら止める
//（画面を素早く渡ると、点け直しが一拍遅れてタイトル画面で点いた。2026-11-04 ひなの自己検品）
async function cameraForScreen() {
  if (!CAMERA_SCREENS.includes(screenNow)) return;
  await vision.startCamera();
  if (!CAMERA_SCREENS.includes(screenNow)) vision.stopCamera();
}
function mountVideo(boxId) {
  const box = $(boxId);
  if (vision && vision.video.parentElement !== box) box.prepend(vision.video);
}
function showError(msg) { $('errMsg').textContent = msg; $('errBox').classList.remove('hidden'); go('title'); }
$('errOk').onclick = () => $('errBox').classList.add('hidden');

// 画面を消さない（磨いている間）
let wake = null;
async function holdWake() { try { wake = await navigator.wakeLock?.request('screen'); } catch { wake = null; } }
function releaseWake() { try { wake?.release(); } catch {} wake = null; }

// ---------- タイトル ----------
function renderLangs() {
  const box = $('langs'); box.innerHTML = '';
  for (const l of LANGS) {
    const b = document.createElement('button');
    b.className = 'btn' + (l.code === getLang() ? ' on' : '');
    b.textContent = l.label;
    b.lang = l.code;
    b.onclick = () => { setLang(l.code); store.setSetting('lang', l.code); refreshTexts(); renderLangs(); };
    box.appendChild(b);
  }
}
// 時計とめやす（3分・星）を見せるか。最初は見せない＝子どもが自分で終わりを決めた時間を測る
//（2026-11-05 ボス「自分が歯磨きし終わったとおもったら歯ブラシを上に上げる」）
function applyGoalSetting() { document.body.classList.toggle('show-goal', !!store.settings.showGoal); }
function phaseText(p = store.settings.phase) { return t(p === 'after' ? 'after' : 'before'); }
function refreshTexts() {
  applyI18n();
  $('phaseLabel').textContent = phaseText();
  $('phaseChip').classList.toggle('after', store.settings.phase === 'after');
  document.title = t('title');
}
function enterTitle() { refreshTexts(); renderLangs(); }
$('appVer').textContent = APP_VERSION;
$('btnStart').onclick = () => { SND.ok(); go('who'); };
$('btnHow').onclick = () => { SND.ok(); go('how'); };
$('btnRecords').onclick = () => gate(() => go('records'));
$('phaseChip').onclick = () => gate(() => go('records'));

// ---------- おとなの確認（足し算） ----------
function gate(onPass) {
  const a = 3 + Math.floor(Math.random() * 6), b = 4 + Math.floor(Math.random() * 5), ans = a + b;
  $('gateQ').textContent = `${a} + ${b} = ?`;
  const opts = [ans, ans + 1 + Math.floor(Math.random() * 3), ans - 1 - Math.floor(Math.random() * 3)].sort(() => Math.random() - .5);
  const box = $('gateA'); box.innerHTML = '';
  for (const o of opts) {
    const btn = document.createElement('button');
    btn.className = 'btn big'; btn.textContent = o;
    btn.onclick = () => { $('gate').classList.add('hidden'); if (o === ans) onPass(); };
    box.appendChild(btn);
  }
  applyI18n($('gate'));
  $('gate').classList.remove('hidden');
}
$('gateCancel').onclick = () => $('gate').classList.add('hidden');

// ---------- あそびかた（れんしゅうつき） ----------
async function enterHow() {
  const my = loopId;
  $('practiceMsg').textContent = t('practice');
  setArc($('practiceArc'), 0, 264);
  try { await ensureReady(); } catch { return; }
  if (my !== loopId) return;
  mountVideo('camHow');
  const timer = new RaiseTimer();
  let done = false;
  const tick = () => {
    if (my !== loopId) return;
    const now = performance.now();
    const fr = vision.detectFrame(timer.lastFace ? { x: timer.lastFace.cx, y: timer.lastFace.cy } : null);
    const ev = timer.update(now, fr.face, fr.hands);
    if (!done) setArc($('practiceArc'), timer.holdProgress(now), 264);
    if (ev === 'armed' && !done) { done = true; SND.armed(); $('practiceMsg').textContent = t('practiceOk'); setArc($('practiceArc'), 1, 264); }
    nextFrame(tick);
  };
  tick();
}
$('btnHowNext').onclick = () => go('who');

// ---------- だれかな ----------
function personButton(p, onPick) {
  const b = document.createElement('button');
  b.className = 'btn'; b.textContent = p.name; b.onclick = () => onPick(p);
  return b;
}
function fillAllNames(onPick) {
  const box = $('allNames'); box.innerHTML = '';
  store.people().slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(p => box.appendChild(personButton(p, onPick)));
  document.querySelector('.all-names').classList.toggle('hidden', !store.people().length);
}

async function enterWho() {
  const my = loopId;
  $('whoAsk').classList.add('hidden'); $('whoPick').classList.add('hidden');
  $('whoStatus').textContent = t('looking');
  const tag = $('whoPhase'); tag.textContent = phaseText(); tag.classList.toggle('after', store.settings.phase === 'after');
  let lastDesc = null, paused = false, rejected = new Set();

  // 本人と確かめた顔を足して覚え直すのは「はい」の時だけ。一覧から選んだ時は足さない
  //（押す直前に別の子が映っていると、その子の顔が混ざる。子ども同士の距離は本人どうしより近いことがある。2026-11-04 紫穂）
  const choose = (p, desc) => {
    SND.ok();
    if (desc) store.addDesc(p.id, desc);
    current = p;
    go('brush');
  };
  fillAllNames(p => choose(p, null));

  try { await ensureReady(); } catch { return; }
  if (my !== loopId) return;
  mountVideo('camWho');
  const guide = $('camWho').querySelector('.face-guide');

  const showSure = (p) => {
    paused = true;
    $('whoName').textContent = p.name;
    $('whoAsk').classList.remove('hidden'); $('whoPick').classList.add('hidden');
    const desc = lastDesc;
    $('whoYes').onclick = () => choose(p, desc);
    $('whoNo').onclick = () => { rejected.add(p.id); $('whoAsk').classList.add('hidden'); paused = false; };
  };
  const showPick = (ranked) => {
    const list = $('pickList'); list.innerHTML = '';
    ranked.forEach(r => list.appendChild(personButton(r.person, q => choose(q, null))));
    $('whoPick').classList.toggle('hidden', !ranked.length);
  };

  const step = async () => {
    if (my !== loopId) return;
    if (!paused) {
      let r = null;
      try { r = await vision.describeFace(); } catch (e) { console.warn(e); }
      if (my !== loopId) return;
      guide.classList.toggle('ok', !!(r && r.desc));
      if (!r) { $('whoStatus').textContent = t('noFace'); lastDesc = null; }
      else if (r.many) { $('whoStatus').textContent = t('manyFaces'); lastDesc = null; }
      else {
        lastDesc = r.desc;
        const people = store.people().filter(p => !rejected.has(p.id));
        const m = vision.matchPeople(r.desc, people);
        if (m.sure) { showSure(m.ranked[0].person); $('whoStatus').textContent = t('whoTitle'); }
        else { showPick(m.ranked); $('whoStatus').textContent = m.ranked.length ? t('pickWho') : t('newPlayer') + '?'; }
      }
    }
    setTimeout(step, 350);
  };
  step();
}
$('btnNewPlayer').onclick = () => go('reg');

// ---------- とうろく ----------
async function enterReg() {
  const my = loopId;
  const shots = [];
  $('regName').value = '';
  $('regStatus').textContent = t('regHint');
  $('regSame').classList.add('hidden');
  const dots = $('regDots'); dots.innerHTML = '';
  for (let i = 0; i < REG_SHOTS; i++) dots.appendChild(document.createElement('i'));
  const btn = $('btnReg');
  const refresh = () => { btn.disabled = !($('regName').value.trim() && shots.length >= REG_SHOTS); btn.style.opacity = btn.disabled ? .5 : 1; };
  $('regName').oninput = refresh;
  refresh();

  btn.onclick = () => {
    if (btn.disabled) return;
    btn.disabled = true; btn.onclick = null;   // 続けて押しても2人にならない
    const p = store.addPerson($('regName').value.trim(), shots);
    SND.end();
    $('regStatus').textContent = t('regDone');
    current = p;
    setTimeout(() => { if (my === loopId) go('brush'); }, 700);
  };

  try { await ensureReady(); } catch { return; }
  if (my !== loopId) return;
  mountVideo('camReg');
  const guide = $('camReg').querySelector('.face-guide');
  let lastBox = null;

  const step = async () => {
    if (my !== loopId) return;
    if (shots.length < REG_SHOTS) {
      let r = null;
      try { r = await vision.describeFace(); } catch (e) { console.warn(e); }
      if (my !== loopId) return;
      guide.classList.toggle('ok', !!(r && r.desc));
      if (!r) $('regStatus').textContent = t('noFace');
      else if (r.many) $('regStatus').textContent = t('manyFaces');
      else {
        $('regStatus').textContent = t('regHint');
        // 同じ向きばかりにならないよう、前の1枚から顔が少し動いた時だけ取る
        const moved = !lastBox || Math.hypot(r.box.x - lastBox.x, r.box.y - lastBox.y) > 0.01 || Math.abs(r.box.w - lastBox.w) > 0.01;
        if (moved || shots.length === 0) {
          shots.push(r.desc); lastBox = r.box;
          dots.children[shots.length - 1]?.classList.add('on');
          SND.ok();
          if (shots.length === REG_SHOTS) {
            $('regStatus').textContent = t('regDone');
            // 既に登録された誰かと同じ顔かも（兄弟・二重登録）
            const m = vision.matchPeople(shots[0], store.people());
            if (m.sure) { $('regSame').textContent = `${t('regSame')} ${m.ranked[0].person.name}`; $('regSame').classList.remove('hidden'); }
          }
          refresh();
        }
      }
    }
    setTimeout(step, 450);
  };
  step();
}

// ---------- みがく ----------
function setArc(el, frac, len) { el.style.strokeDashoffset = String(len * (1 - Math.max(0, Math.min(1, frac)))); }
function banner(text, cls = '') {
  const b = $('banner');
  if (b.textContent !== text) { b.textContent = text; b.className = 'banner ' + cls; void b.offsetWidth; }
}

async function enterBrush() {
  const my = loopId;
  if (!current) { go('who'); return; }
  const phase = store.settings.phase;
  $('brushWho').textContent = current.name;
  const tag = $('brushPhase'); tag.textContent = phaseText(phase); tag.classList.toggle('after', phase === 'after');
  $('timer').textContent = fmtClock(0);
  setArc($('goalArc'), 0, 603);
  $('goalArc').parentElement.classList.remove('reached');
  banner(current.name + t('hello'));
  enemyStage = ''; $('enemy').classList.remove('gone', 'hit', 'scrub'); $('enemy')._tick = -1; updateEnemy(0, 'WAIT_START');
  updateCheer(0, 'WAIT_START', 0);
  try { await ensureReady(); } catch { return; }
  if (my !== loopId) return;
  mountVideo('camBrush');
  holdWake();

  const timer = new RaiseTimer();
  const canvas = $('overlay'), ctx = canvas.getContext('2d');
  const manual = $('btnManual');
  const setManual = () => { manual.querySelector('span').textContent = t(timer.state === 'BRUSHING' ? 'staffStop' : 'staffStart'); };
  setManual();
  manual.onclick = () => {
    const now = performance.now();
    const ev = timer.state === 'BRUSHING' ? timer.manualStop(now) : timer.manualStart(now);
    if (ev === 'start') SND.start();
    if (ev === 'end') finish(timer);
    setManual();
  };
  $('btnQuit').onclick = () => go('title');
  const enteredAt = performance.now();

  const tick = () => {
    if (my !== loopId) return;
    const now = performance.now();
    const fr = vision.detectFrame(timer.lastFace ? { x: timer.lastFace.cx, y: timer.lastFace.cy } : null);
    const ev = timer.update(now, fr.face, fr.hands);
    if (ev === 'armed') { SND.armed(); }
    if (ev === 'start') { SND.start(); setManual(); }
    if (ev === 'cancel') { banner(t('raiseToStart')); }
    if (ev === 'end') { finish(timer); return; }

    // 画面の文字
    const st = timer.state;
    const prog = timer.holdProgress(now);
    $('hold').classList.toggle('on', (prog > 0 || timer.raisingEarly(now)) && st !== 'ARMED');
    setArc($('holdArc'), prog, 264);
    if (st === 'WAIT_START' && prog > 0) banner(t('keepUp'), 'go');
    else if (st === 'WAIT_START' && now - enteredAt > 1600) banner(t('raiseToStart'));
    else if (st === 'ARMED') banner(t('lowerToBrush'), 'go');
    else if (st === 'BRUSHING') {
      const el = timer.elapsed(now);
      const seen = fr.face || fr.hands.length;
      if (!seen && now - timer.lastSeenAt > 3000) banner(t('outOfView'));
      else if (timer.raisingEarly(now)) banner(t('tooEarly'));
      else if (prog > 0) banner(t('keepUp'), 'go');
      else {
        // 応援の言葉を順に。3分などの時間の合図は出さない（終わりは子どもが決める）
        // 「おわったら あげてね」は帯で繰り返すと、やめる合図になる（2026-11-05 紫穂・葵）。下の小さな案内に常に出す
        const k = Math.floor(el / 6000) % 3;
        banner(t(['beatMutans', 'cheer1', el > 30000 ? 'cheer3' : 'cheer2'][k]), 'brushing');
      }
    }
    const el = timer.elapsed(now);
    $('timer').textContent = fmtClock(el);
    $('timer').parentElement.classList.toggle('idle', st !== 'BRUSHING');
    setArc($('goalArc'), el / GOAL_MS, 603);
    $('goalArc').parentElement.classList.toggle('reached', el >= GOAL_MS);
    updateEnemy(el, st);
    updateCheer(el, st, now);
    $('endHint').classList.toggle('on', st === 'BRUSHING');

    drawOverlay(ctx, canvas, fr, timer);
    nextFrame(tick);
  };
  tick();
}

// 絵のコマ。新しいコマ（薫に依頼中）が無ければ、今ある絵で代わりにする
const CHARA = 'assets/chara/';
const FALLBACK = {
  dentman_raise_v2: 'dentman_raise', dentman_cheer_a: 'dentman_cheer', dentman_cheer_b: 'dentman_cheer',
  dentman_wave_a: 'dentman_point', dentman_wave_b: 'dentman_point',
  mutans_hp4: 'mutans_normal', mutans_hp3: 'mutans_weak', mutans_hp2: 'mutans_weak', mutans_hp1: 'mutans_weak', mutans_hp0: 'mutans_weak',
};
function setFrame(img, name) {
  if (img.dataset.frame === name) return;
  img.dataset.frame = name;
  img.onerror = () => { const f = FALLBACK[name]; if (f && !img.src.endsWith(f + '.png')) img.src = CHARA + f + '.png'; };
  img.src = CHARA + name + '.png';
}

// ミュータンスくん：磨いている時間とともに弱っていく（4段階）。磨いている間は0にならない
//（0になって逃げるのは、子どもが歯ブラシを上げて終わった後＝けっか画面）
let enemyStage = '';
function updateEnemy(el, st) {
  const enemy = $('enemy');
  const brushing = st === 'BRUSHING';
  enemy.classList.toggle('scrub', brushing);
  $('hpBar').style.width = (Math.max(0, 1 - el / GOAL_MS) * 100).toFixed(1) + '%';   // 目安を見せる時だけ出る
  const stage = !brushing ? 'mutans_hp4' : el < 20000 ? 'mutans_hp4' : el < 45000 ? 'mutans_hp3' : el < 80000 ? 'mutans_hp2' : 'mutans_hp1';
  if (stage !== enemyStage) {
    enemyStage = stage;
    setFrame($('enemyImg'), stage);
    if (brushing && el > 1000) { enemy.classList.remove('hit'); void enemy.offsetWidth; enemy.classList.add('hit'); }
  }
  // 5秒ごとに「効いた」揺れ
  if (brushing && Math.floor(el / 5000) !== enemy._tick) {
    enemy._tick = Math.floor(el / 5000);
    if (el > 1000) { enemy.classList.remove('hit'); void enemy.offsetWidth; enemy.classList.add('hit'); }
  }
}

// デンタマン：始まる前は「掲げる」手本、磨いている間は応援（2コマを交互に・6秒ごとにポーズを替える）
function updateCheer(el, st, now) {
  const box = $('cheer'), img = $('cheerImg');
  const brushing = st === 'BRUSHING';
  box.classList.toggle('go', brushing);
  if (!brushing) { setFrame(img, 'dentman_raise_v2'); return; }
  const pose = Math.floor(el / 6000) % 2 ? 'dentman_wave' : 'dentman_cheer';
  setFrame(img, `${pose}_${Math.floor(now / 380) % 2 ? 'b' : 'a'}`);
}

// 顔の上に「ここより上にあげる」線、手の点を描く（文字は描かない＝鏡にすると読めないので）
function drawOverlay(ctx, canvas, fr, timer) {
  const box = canvas.parentElement;
  const cw = box.clientWidth, ch = box.clientHeight, dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(cw * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const v = vision.video, vw = v.videoWidth || 1, vh = v.videoHeight || 1;
  const s = Math.max(cw / vw, ch / vh), dx = (cw - vw * s) / 2, dy = (ch - vh * s) / 2;
  const X = x => dx + x * vw * s, Y = y => dy + y * vh * s;

  const face = fr.face || timer.lastFace;
  if (face) {
    const h = face.bottom - face.top;
    const lineY = Y(face.top - h * CFG.ENTER);
    const x0 = X(face.cx - face.w * CFG.SIDE), x1 = X(face.cx + face.w * CFG.SIDE);
    const st = timer.state;
    if (st !== 'ARMED') {
      ctx.setLineDash([14, 10]); ctx.lineWidth = 5;
      ctx.strokeStyle = timer.holdProgress(performance.now()) > 0 ? '#ffcf3d' : 'rgba(255,255,255,.8)';
      ctx.beginPath(); ctx.moveTo(x0, lineY); ctx.lineTo(x1, lineY); ctx.stroke(); ctx.setLineDash([]);
      // 上向きの矢印
      ctx.fillStyle = 'rgba(255,207,61,.95)';
      for (const ax of [x0 + 24, x1 - 24]) { ctx.beginPath(); ctx.moveTo(ax, lineY - 34); ctx.lineTo(ax - 16, lineY - 10); ctx.lineTo(ax + 16, lineY - 10); ctx.closePath(); ctx.fill(); }
    }
    if (fr.face) {
      ctx.strokeStyle = 'rgba(47,211,163,.7)'; ctx.lineWidth = 3;
      const fx = X(face.left), fy = Y(face.top), fw = face.w * vw * s, fh = h * vh * s;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(fx, fy, fw, fh, 18) : ctx.rect(fx, fy, fw, fh); ctx.stroke();
    }
  }
  ctx.fillStyle = '#ffcf3d';
  for (const hand of fr.hands) for (const i of [0, 4, 8, 12, 16, 20]) {
    const p = hand.pts[i]; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), i === 0 ? 9 : 6, 0, Math.PI * 2); ctx.fill();
  }
}

function finish(timer) {
  loopId++;
  releaseWake();
  vision.stopCamera();
  const ms = timer.elapsed(0);
  SND.end();
  const rec = store.addRecord({ personId: current.id, phase: store.settings.phase, ms, mouthMs: Math.round(timer.mouthMs), lostMs: Math.round(timer.lostMs), endedBy: timer.endedBy });
  showResult(rec);
}

// ---------- けっか ----------
function showResult(rec) {
  screens.forEach(s => $('s-' + s).classList.toggle('on', s === 'result'));
  applyI18n($('s-result'));
  $('resTime').textContent = fmtDuration(rec.ms);
  const n = rec.ms >= GOAL_MS ? 3 : rec.ms >= 120000 ? 2 : rec.ms >= 60000 ? 1 : 0;
  $('stars').innerHTML = [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">⭐</span>`).join('');
  // 自分で終えた（掲げた・係の人が止めた）なら、ミュータンスくんは倒れてから逃げる
  const ran = rec.endedBy === 'gesture' || rec.endedBy === 'manual';
  const rm = $('resMutans');
  rm.classList.remove('run', 'down');
  if (ran) { setFrame(rm, 'mutans_hp0'); void rm.offsetWidth; rm.classList.add('down'); }
  else setFrame(rm, enemyStage || 'mutans_hp4');   // 中断・10分で止まった時は倒さず、止まった時の段のまま（2026-11-05 葵）
  if (ran) setTimeout(() => { setFrame(rm, 'mutans_defeated'); rm.classList.add('run'); }, 900);
  const goal = !!store.settings.showGoal;
  $('resNote').textContent = rec.endedBy === 'lost' ? t('endedLost') : rec.endedBy === 'timeout' ? t('endedTimeout')
    : goal && rec.ms >= GOAL_MS ? `${t('goalReached')} ${t('mutansRan')}` : goal ? t('goal') : t('mutansRan');

  const sm = summary(rec.personId);
  const box = $('resCompare'); box.innerHTML = '';
  // 前の平均や「前より長い」は次の回の目当てになる＝目安を見せる時だけ（2026-11-05 葵）
  box.classList.add('goal-only');
  const add = (label, ms, count) => {
    if (ms === null) return;
    const d = document.createElement('div'); d.className = 'box';
    d.innerHTML = `<small></small><b></b><small></small>`;
    d.children[0].textContent = label; d.children[1].textContent = fmtDuration(ms); d.children[2].textContent = `${num(count)} ${t('times')}`;
    box.appendChild(d);
  };
  add(t('lastBefore'), sm.avgBefore, sm.before.length);
  add(t('lastAfter'), sm.avgAfter, sm.after.length);
  if (rec.phase === 'after' && sm.avgBefore !== null && rec.ms > sm.avgBefore) {
    const p = document.createElement('div'); p.className = 'praise'; p.textContent = t('longer'); box.appendChild(p);
  }
  $('btnAgain').onclick = () => go('brush');
}

// ---------- きろく ----------
function enterRecords() {
  // 指導前／指導後の切り替え（係の人がここで決める）
  const sw = $('phaseSwitch'); sw.innerHTML = '';
  const lab = document.createElement('span'); lab.textContent = t('phase') + '：'; sw.appendChild(lab);
  for (const ph of ['before', 'after']) {
    const b = document.createElement('button');
    b.className = 'btn' + (store.settings.phase === ph ? ' on' : '');
    b.textContent = t(ph);
    b.onclick = () => { store.setSetting('phase', ph); enterRecords(); };
    sw.appendChild(b);
  }

  const gs = $('goalSwitch'); gs.innerHTML = '';
  const gl = document.createElement('span'); gl.textContent = t('showGoal') + '：'; gs.appendChild(gl);
  for (const on of [false, true]) {
    const b = document.createElement('button');
    b.className = 'btn' + (!!store.settings.showGoal === on ? ' on' : '');
    b.textContent = t(on ? 'goalOn' : 'goalOff');
    b.onclick = () => { store.setSetting('showGoal', on); applyGoalSetting(); enterRecords(); };
    gs.appendChild(b);
  }

  const list = $('recList'); list.innerHTML = '';
  const people = store.people();
  if (!people.length) { list.innerHTML = `<p class="empty"></p>`; list.firstChild.textContent = t('noRecords'); return; }
  const maxMs = Math.max(GOAL_MS, ...store.records().map(r => r.ms)) * 1.05;

  for (const p of people) {
    const sm = summary(p.id);
    const card = document.createElement('div'); card.className = 'person';
    const head = document.createElement('div'); head.className = 'person-head';
    const h3 = document.createElement('h3'); h3.textContent = p.name; head.appendChild(h3);
    if (sm.diff !== null) {
      const d = document.createElement('span');
      d.className = 'delta ' + (sm.diff >= 0 ? 'up' : 'down');
      d.textContent = `${t('change')} ${sm.diff >= 0 ? '+' : '−'}${fmtDuration(Math.abs(sm.diff))}`;
      head.appendChild(d);
    }
    card.appendChild(head);

    const bars = document.createElement('div'); bars.className = 'bars';
    for (const [ph, avg, arr] of [['before', sm.avgBefore, sm.before], ['after', sm.avgAfter, sm.after]]) {
      const l = document.createElement('span'); l.textContent = t(ph);
      const tr = document.createElement('div'); tr.className = 'track';
      tr.innerHTML = `<div class="fill ${ph}" style="width:${avg === null ? 0 : (avg / maxMs * 100).toFixed(1)}%"></div><div class="goalmark" style="left:${(GOAL_MS / maxMs * 100).toFixed(1)}%"></div>`;
      const v = document.createElement('span'); v.textContent = avg === null ? '—' : `${fmtDuration(avg)}（${num(arr.length)} ${t('times')}）`;
      bars.append(l, tr, v);
    }
    card.appendChild(bars);

    const det = document.createElement('details');
    const sum = document.createElement('summary'); sum.textContent = t('allRecords'); det.appendChild(sum);
    const tbl = document.createElement('table'); tbl.className = 'rec-table';
    const recs = store.records(p.id).slice().sort((a, b) => b.at - a.at);
    for (const r of recs) {
      const tr = document.createElement('tr');
      const d = new Date(r.at);
      const cells = [`${num(d.getMonth() + 1)}/${num(d.getDate())} ${num(String(d.getHours()).padStart(2, '0'))}:${num(String(d.getMinutes()).padStart(2, '0'))}`, t(r.phase), fmtDuration(r.ms), t('ended_' + r.endedBy)];
      for (const c of cells) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }
      const td = document.createElement('td'); const del = document.createElement('button'); del.className = 'btn small danger'; del.textContent = t('deleteRecord');
      del.onclick = () => { if (confirm(t('confirmDel'))) { store.removeRecord(r.id); enterRecords(); } };
      td.appendChild(del); tr.appendChild(td); tbl.appendChild(tr);
    }
    det.appendChild(tbl);
    const delP = document.createElement('button'); delP.className = 'btn small danger'; delP.textContent = t('deletePerson');
    delP.onclick = () => { if (confirm(`${p.name}: ${t('confirmDel')}`)) { store.removePerson(p.id); enterRecords(); } };
    det.appendChild(delP);
    card.appendChild(det);
    list.appendChild(card);
  }
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const stamp = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };
$('btnCsv').onclick = () => download(`hamigaki_records_${stamp()}.csv`, store.csv(), 'text/csv');
$('btnBackup').onclick = () => download(`hamigaki_backup_${stamp()}.json`, store.backup(), 'application/json');
$('fileRestore').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { store.restore(await f.text()); applyGoalSetting(); enterRecords(); } catch (err) { alert(t('restoreError')); }
  e.target.value = '';
};
$('btnWipe').onclick = () => { if (confirm(t('confirmDel')) && confirm(t('confirmDel'))) { store.wipe(); applyGoalSetting(); enterRecords(); } };

// ---------- 起動 ----------
setLang(store.settings.lang || 'km');
applyGoalSetting();
go('title');
$('loading').classList.add('hidden');
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
