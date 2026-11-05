// 端末の中だけに置く記録（localStorage）。外へは送らない。
// 人：{ id, name, descs: [[128個の数], ...], createdAt }
// 記録：{ id, personId, phase: 'before' | 'after', at, ms, mouthMs, lostMs, endedBy }
const KEY = 'hamigaki-timer-v1';
const MAX_DESCS = 20;

function empty() { return { people: [], records: [], settings: { lang: 'km', phase: 'before' } }; }

let db = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch (e) { console.warn('記録を読めませんでした', e); }
  return empty();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); return true; }
  catch (e) { console.warn('記録を保存できませんでした', e); return false; }
}

// ブラウザに「消さないで」と頼む（Safari が使っていない保存領域を消すのを防ぐ）
export async function askPersist() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; }
  catch { return false; }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const store = {
  get settings() { return db.settings; },
  setSetting(k, v) { db.settings[k] = v; save(); },

  people() { return db.people; },
  person(id) { return db.people.find(p => p.id === id); },
  addPerson(name, descs) {
    const p = { id: uid(), name, descs: descs.map(d => Array.from(d)), createdAt: Date.now() };
    db.people.push(p); save(); return p;
  },
  // 本人と確かめた顔を1枚足す（子どもは顔が変わるので育てる）。古い順に捨てる
  addDesc(id, desc) {
    const p = this.person(id); if (!p) return;
    p.descs.push(Array.from(desc));
    if (p.descs.length > MAX_DESCS) p.descs.splice(0, p.descs.length - MAX_DESCS);
    save();
  },
  rename(id, name) { const p = this.person(id); if (p) { p.name = name; save(); } },
  removePerson(id) {
    db.people = db.people.filter(p => p.id !== id);
    db.records = db.records.filter(r => r.personId !== id);
    save();
  },

  records(personId) { return personId ? db.records.filter(r => r.personId === personId) : db.records; },
  addRecord(r) { const rec = { id: uid(), at: Date.now(), ...r }; db.records.push(rec); save(); return rec; },
  removeRecord(id) { db.records = db.records.filter(r => r.id !== id); save(); },

  wipe() { db = empty(); save(); },

  // 書き出し（顔の数値は入れない）
  csv() {
    const head = ['person_id', 'name', 'phase', 'date', 'time', 'seconds', 'hand_near_mouth_seconds', 'out_of_view_seconds', 'ended_by'];
    const rows = db.records.map(r => {
      const p = this.person(r.personId);
      const d = new Date(r.at);
      const pad = n => String(n).padStart(2, '0');
      return [
        r.personId, p ? p.name : '?', r.phase,
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
        (r.ms / 1000).toFixed(1), ((r.mouthMs || 0) / 1000).toFixed(1), ((r.lostMs || 0) / 1000).toFixed(1), r.endedBy,
      ];
    });
    // 名前が = + - @ タブ CR で始まると Excel が式として読むので、先頭に ' を付ける
    const safe = v => (/^[=+\-@\t\r]/.test(String(v)) ? "'" + v : String(v));
    const esc = v => { const x = safe(v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
    return '﻿' + [head, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  },
  // 端末を変える時の控え（顔の数値も入る＝取り扱い注意）
  backup() { return JSON.stringify({ app: KEY, savedAt: Date.now(), ...db }); },
  restore(text) {
    const d = JSON.parse(text);
    if (d.app !== KEY || !Array.isArray(d.people) || !Array.isArray(d.records)) throw new Error('bad file');
    db = { ...empty(), people: d.people, records: d.records, settings: { ...empty().settings, ...d.settings } };
    save();
  },
};

// 1人ぶんのまとめ（指導前・指導後の平均と差）
export function summary(personId) {
  const rs = store.records(personId);
  const pick = ph => rs.filter(r => r.phase === ph).map(r => r.ms);
  const avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const before = pick('before'), after = pick('after');
  const b = avg(before), a = avg(after);
  return { before, after, avgBefore: b, avgAfter: a, diff: b !== null && a !== null ? a - b : null };
}
