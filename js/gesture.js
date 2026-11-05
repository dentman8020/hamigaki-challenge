// 「歯ブラシを頭の上に掲げる」合図で、歯みがきの開始と終わりを決める状態機械。
// 映像やモデルには触らない（1コマごとの観測だけを受け取る）ので、node でも試せる。
//
// 流れ：
//   WAIT_START … 掲げるのを待つ
//   ARMED      … 掲げたまま HOLD_MS 続いた。下ろした瞬間が「開始」
//   BRUSHING   … 計測中。MIN_BRUSH_MS を過ぎてから、もう一度 HOLD_MS 掲げたら終わり
//   DONE       … 終わり。終了時刻は「掲げ始めた瞬間」（掲げて待つ時間は数えない）
//
// 座標はすべて正規化（0〜1、y は下向き）。鏡像にする前の値で渡す。

export const CFG = {
  ENTER: 0.30,          // 掲げた：手首と中指の付け根が「顔の上端 − 顔の高さ×0.30」より上
  EXIT: 0.0,            // 下ろした：手首が顔の上端より下。間の帯は前の状態のまま（ちらつき止め）
  SIDE: 1.6,            // 顔の中心から横に顔の幅×1.6 より外の手は数えない（隣の子）
  SIZE_MIN: 0.25,       // 手首〜中指の付け根の長さが顔の幅×0.25〜1.3 の手だけ（奥の大人・手前の手を除く）
  SIZE_MAX: 1.3,
  HOLD_MS: 800,         // 掲げたと認めるまで続ける長さ
  GAP_MS: 250,          // 掲げている途中でこの長さまでの取りこぼしは「続いている」と見る
  DROP_MS: 300,         // ARMED から、この長さ下ろしたままなら開始とみなす
  ARMED_TIMEOUT_MS: 15000, // 掲げたまま15秒下ろさなければ、最初からやり直し
  MIN_BRUSH_MS: 10000,  // 開始直後のこの長さは、掲げても終わりにしない（手を振る子・下ろし損ね）
  MAX_BRUSH_MS: 10 * 60 * 1000, // これを超えたら自動で止める
  FACE_KEEP_MS: 3000,   // 顔が見えなくなっても、直前の顔の位置をこの長さ使う
  LOST_END_MS: 30000,   // 磨いている途中で顔も手も30秒見えなければ「中断」で終える
  MOUTH_NEAR: 0.9,      // 手が口の近く＝手のどこかが口から顔の幅×0.9 以内（「口もとに手」の秒数）
  TRACK_R: 2.0,         // 掲げていた手を追いかける半径（顔の幅×2.0＝1コマで動ける幅。見失っている間は1秒に×8ずつ広げ、
  TRACK_GROW: 8.0,      //  ×3.0 で止める。胸の前の手は頭上の手から顔の幅×3.7 ほど離れているので拾わない）
  TRACK_MAX: 3.0,
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// 顔と手から、使える手（この子の手）だけを残す
export function ownHands(face, hands, c = CFG) {
  if (!face || !hands) return [];
  return hands.filter(h => {
    const w = h.pts[0], m = h.pts[9];
    if (!w || !m) return false;
    if (Math.abs(m.x - face.cx) > face.w * c.SIDE) return false;
    const size = dist(w, m) / face.w;
    return size >= c.SIZE_MIN && size <= c.SIZE_MAX;
  });
}

// 掲げの段階：'up'（入りの線より上）・'down'（出の線より下）・'mid'（間）
export function raiseLevel(face, hands, c = CFG) {
  const own = ownHands(face, hands, c);
  if (!own.length) return 'down';
  const h = face.bottom - face.top;
  const enter = face.top - h * c.ENTER;
  const exit = face.top - h * c.EXIT;
  let best = 'down';
  for (const hand of own) {
    const w = hand.pts[0], m = hand.pts[9];
    if (w.y < enter && m.y < enter) return 'up';
    if (w.y < exit) best = 'mid';
  }
  return best;
}

// 掲げている手（入りの線より上で、いちばん高い手）
export function raisedHand(face, hands, c = CFG) {
  const own = ownHands(face, hands, c);
  const enter = face.top - (face.bottom - face.top) * c.ENTER;
  const ups = own.filter(h => h.pts[0].y < enter && h.pts[9].y < enter);
  return ups.length ? ups.reduce((a, b) => (a.pts[0].y <= b.pts[0].y ? a : b)) : null;
}

export function handNearMouth(face, hands, c = CFG) {
  if (!face || !face.mouth) return false;
  const r = face.w * c.MOUTH_NEAR;
  return ownHands(face, hands, c).some(h => h.pts.some(p => dist(p, face.mouth) <= r));
}

export class RaiseTimer {
  constructor(cfg = CFG) {
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.state = 'WAIT_START';
    this.up = false;          // ヒステリシスつきの「掲げている」
    this.raiseSince = null;   // 今回の掲げが始まった時刻
    this.lastRaised = null;   // 最後に掲げていたコマの時刻
    this.lowSince = null;     // 下ろし始めた時刻（ARMED 中）
    this.lastLowAt = null;    // 最後に「下ろしている」と見えた時刻（ARMED 中）
    this.track = null;        // 掲げていた手の手首 { x, y, t }（ARMED 中に追いかける）
    this.others = [];         // 掲げていた時に見えていた、もう片方の手の手首（取り違えないように除く）
    this.armedAt = null;
    this.startAt = null;
    this.endAt = null;
    this.endedBy = null;
    this.lastFace = null;
    this.lastFaceAt = null;
    this.lastSeenAt = null;   // 顔か手が最後に見えた時刻
    this.mouthMs = 0;         // 磨いている間に手が口もとにあった合計
    this.lostMs = 0;          // 磨いている間に顔も手も見えなかった合計
    this.prevT = null;
  }

  // 顔が一瞬消えても判定が切れないように、直前の顔をしばらく使う
  faceFor(face, t) {
    if (face) { this.lastFace = face; this.lastFaceAt = t; return face; }
    if (this.lastFace && t - this.lastFaceAt <= this.cfg.FACE_KEEP_MS) return this.lastFace;
    return null;
  }

  // 掲げが HOLD_MS 続いているか（GAP_MS までの取りこぼしは許す）
  trackRaise(level, t) {
    if (level === 'up') this.up = true;
    else if (level === 'down') this.up = false;
    if (this.up) {
      if (this.raiseSince === null || t - this.lastRaised > this.cfg.GAP_MS) this.raiseSince = t;
      this.lastRaised = t;
    } else if (this.raiseSince !== null && t - this.lastRaised > this.cfg.GAP_MS) {
      this.raiseSince = null;
    }
    return this.up && this.raiseSince !== null && t - this.raiseSince >= this.cfg.HOLD_MS;
  }

  // 掲げの進み具合 0〜1（画面のゲージ用）
  holdProgress(t) {
    if (!this.up || this.raiseSince === null) return 0;
    let from = this.raiseSince;
    if (this.state === 'BRUSHING') {
      const min = this.startAt + this.cfg.MIN_BRUSH_MS;
      if (t < min) return 0;              // 10秒までは満たさない（画面は「まだ はじまった ばかりだよ」）
      from = Math.max(from, min);
    }
    return Math.min(1, (t - from) / this.cfg.HOLD_MS);
  }
  raisingEarly(t) { return this.state === 'BRUSHING' && this.up && t < this.startAt + this.cfg.MIN_BRUSH_MS; }

  // 1コマ進める。戻り値は起きた出来事（'armed' | 'start' | 'end' | 'cancel' | null）
  update(t, face, hands) {
    const c = this.cfg;
    const dt = this.prevT === null ? 0 : Math.min(500, t - this.prevT);
    this.prevT = t;
    const f = this.faceFor(face, t);
    const level = raiseLevel(f, hands, c);
    const held = this.trackRaise(level, t);
    if (face || (hands && hands.length)) this.lastSeenAt = t;

    switch (this.state) {
      case 'WAIT_START':
        if (held) {
          this.state = 'ARMED'; this.armedAt = t; this.lowSince = null; this.lastLowAt = null;
          this.track = null; this.followRaised(f, hands, t);
          return 'armed';
        }
        return null;

      case 'ARMED': {
        // 「下ろした」＝掲げていた手そのものが、顔の上端より下に見えた時だけ。
        // 手が見えない・別の手（胸の前の手）しか見えない・間の帯にある、はどれも下ろしと数えない。
        // （2026-11-04 紫穂・葵の検品：手の検出が落ちる／片手だけ見える場面で、下ろしていないのに始まった）
        if (level === 'up') {
          this.followRaised(f, hands, t);
          this.lowSince = null; this.lastLowAt = null;
        } else {
          const h = this.findTracked(f, hands, t);
          const lowered = !!h && h.pts[0].y >= f.top - (f.bottom - f.top) * c.EXIT;
          if (lowered) {
            if (this.lowSince === null) this.lowSince = t;
            this.lastLowAt = t;
            if (t - this.lowSince >= c.DROP_MS) {
              this.state = 'BRUSHING';
              this.startAt = this.lowSince;       // 下ろし始めた瞬間を開始にする
              this.raiseSince = null;
              return 'start';
            }
            return null;
          }
          // 下ろしが GAP_MS を超えて途切れたら、その下ろしは無かったことにする（古い時刻から始めない）
          if (this.lowSince !== null && t - this.lastLowAt > c.GAP_MS) { this.lowSince = null; this.lastLowAt = null; }
        }
        // 15秒たっても下ろし始めていなければやり直し（下ろし途中の DROP_MS の間だけは待つ）
        if (t - this.armedAt >= c.ARMED_TIMEOUT_MS && this.lowSince === null) { this.reset(); return 'cancel'; }
        return null;
      }

      case 'BRUSHING': {
        if (t - this.startAt >= c.MAX_BRUSH_MS) return this.finish(this.startAt + c.MAX_BRUSH_MS, 'timeout');
        const seen = face || (hands && hands.length);
        if (!seen) {
          this.lostMs += dt;
          if (t - this.lastSeenAt >= c.LOST_END_MS) return this.finish(this.lastSeenAt, 'lost');
        } else if (handNearMouth(f, hands, c)) {
          this.mouthMs += dt;
        }
        // 終わり：開始から10秒を過ぎた後に、掲げが HOLD_MS 続いたら。終わりの時刻は実際に掲げ始めた時刻
        //（10秒前から掲げ続けた時も同じ。10秒に丸めると、磨くのをやめた後の秒まで数えてしまう＝2026-11-04 紫穂）
        if (this.up && this.raiseSince !== null) {
          const from = Math.max(this.raiseSince, this.startAt + c.MIN_BRUSH_MS);
          if (t - from >= c.HOLD_MS) return this.finish(this.raiseSince, 'gesture');
        }
        return null;
      }

      default:
        return null;
    }
  }

  // 掲げている手の位置を覚える
  followRaised(face, hands, t) {
    if (!face) return;
    const h = raisedHand(face, hands, this.cfg);
    if (!h) return;
    this.track = { x: h.pts[0].x, y: h.pts[0].y, t };
    this.others = ownHands(face, hands, this.cfg).filter(o => o !== h).map(o => ({ x: o.pts[0].x, y: o.pts[0].y }));
  }
  // 覚えた手に近い手を探す（見失っている間は探す半径を広げる）。見つかれば位置を更新して返す
  findTracked(face, hands, t) {
    if (!face || !this.track) return null;
    const c = this.cfg;
    const r = face.w * Math.min(c.TRACK_MAX, c.TRACK_R + c.TRACK_GROW * (t - this.track.t) / 1000);
    // 掲げていた時から頬・口もと・額にあったもう片方の手（その位置から顔の幅×0.5 以内）は候補にしない
    //（掲げた手が一瞬見えなくなった時に、そちらを「下ろした手」と取り違えて早く始まった。2026-11-04 紫穂）
    const near = (h, o) => Math.hypot(h.pts[0].x - o.x, h.pts[0].y - o.y) < face.w * 0.5;
    let best = null, bd = Infinity;
    for (const h of ownHands(face, hands, c)) {
      if (this.others.some(o => near(h, o))) continue;
      const d = Math.hypot(h.pts[0].x - this.track.x, h.pts[0].y - this.track.y);
      if (d < bd) { bd = d; best = h; }
    }
    if (!best || bd > r) return null;
    this.track = { x: best.pts[0].x, y: best.pts[0].y, t };
    return best;
  }

  // 係の人のボタン用
  manualStart(t) {
    if (this.state === 'BRUSHING' || this.state === 'DONE') return null;
    this.state = 'BRUSHING'; this.startAt = t; this.raiseSince = null; this.prevT = t; this.lastSeenAt = t;
    return 'start';
  }
  manualStop(t) {
    if (this.state !== 'BRUSHING') return null;
    return this.finish(t, 'manual');
  }

  finish(t, by) {
    this.state = 'DONE';
    this.endAt = t;
    this.endedBy = by;
    return 'end';
  }

  elapsed(t) {
    if (this.startAt === null) return 0;
    return Math.max(0, (this.state === 'DONE' ? this.endAt : t) - this.startAt);
  }
}
