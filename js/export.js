// Excel（.xlsx）の書き出し。SheetJS（vendor/sheetjs、Apache-2.0）を使う時だけ読み込む。端末の中で作って保存するだけ。
import { t, getLang } from './i18n.js';
import { store } from './store.js';

let loading = null;
function loadSheetJS() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/sheetjs/xlsx.mini.min.js';
      s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error('XLSX not found')));
      s.onerror = () => { loading = null; reject(new Error('XLSX load failed')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

// 'YYYY-MM-DD'（input type=date の値）→ その日の 0:00 の時刻。空なら null
function dayStart(v) { if (!v) return null; const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }

// 条件に合う記録を選ぶ。personIds が null なら全員。from/to はその日を含む
export function pickRecords({ personIds = null, from = '', to = '' } = {}) {
  const f = dayStart(from), tEnd = dayStart(to);
  const until = tEnd === null ? null : tEnd + 24 * 3600 * 1000;   // to の日の終わりまで
  return store.records()
    .filter(r => !personIds || personIds.includes(r.personId))
    .filter(r => (f === null || r.at >= f) && (until === null || r.at < until))
    .sort((a, b) => a.at - b.at);
}

const sec = ms => Math.round((ms || 0) / 100) / 10;   // 0.1秒まで
// 名前が = + - @ タブ CR で始まる時は先頭に ' を付ける（CSV と同じ。表計算で式として読まれないように）
const safe = v => (/^[=+\-@\t\r]/.test(String(v)) ? "'" + v : String(v));

export async function exportXlsx({ personIds = null, from = '', to = '', appVersion = '' } = {}) {
  const recs = pickRecords({ personIds, from, to });
  if (!recs.length) return { count: 0 };
  const XLSX = await loadSheetJS();
  const nameOf = id => safe(store.person(id)?.name ?? '?');

  // 1枚目：記録（1行1回）
  const head = [t('xPersonId'), t('xName'), t('xPhase'), t('xDate'), t('xTime'), t('xSeconds'), t('xMouthSec'), t('xOutSec'), t('xEndedBy')];
  const rows = recs.map(r => {
    const d = new Date(r.at);
    return [r.personId, nameOf(r.personId), t(r.phase),
      new Date(d.getFullYear(), d.getMonth(), d.getDate()),                     // Excel の日付として入る
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`,
      sec(r.ms), sec(r.mouthMs), sec(r.lostMs), t('ended_' + r.endedBy)];
  });
  const ws1 = XLSX.utils.aoa_to_sheet([head, ...rows], { cellDates: true, dateNF: 'yyyy-mm-dd' });
  ws1['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];
  ws1['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: head.length - 1 } }) };

  // 2枚目：人ごとのまとめ（書き出した記録の範囲で）
  const ids = [...new Set(recs.map(r => r.personId))];
  // 無い値は null（空のセルになる。長さ0の文字のセルにしない）
  const avgMs = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
  const sumHead = [t('xPersonId'), t('xName'), t('xBeforeN'), t('xBeforeAvg'), t('xAfterN'), t('xAfterAvg'), t('xChange')];
  const sumRows = ids.map(id => {
    const b = recs.filter(r => r.personId === id && r.phase === 'before').map(r => r.ms);
    const a = recs.filter(r => r.personId === id && r.phase === 'after').map(r => r.ms);
    const mb = avgMs(b), ma = avgMs(a);
    // 変化は ms の平均どうしの差を取ってから1回だけ丸める（画面のカードと同じ）
    return [id, nameOf(id), b.length, mb === null ? null : sec(mb), a.length, ma === null ? null : sec(ma), mb !== null && ma !== null ? sec(ma - mb) : null];
  });
  const ws2 = XLSX.utils.aoa_to_sheet([sumHead, ...sumRows]);
  ws2['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];

  // 3枚目：条件（いつ・誰を・どの期間で書き出したか）
  const now = new Date();
  // 選んだ人は全員書く（期間内に記録が無い人も。0件の人には印）
  const who = personIds
    ? personIds.map(id => nameOf(id) + (ids.includes(id) ? '' : ` (${t('xNoRec')})`)).join(', ') || '—'
    : t('xAll');
  const ws3 = XLSX.utils.aoa_to_sheet([
    [t('xExportedAt'), now.toLocaleString({ ja: 'ja-JP', km: 'km-KH' }[getLang()] || 'en-GB')],
    [t('xPeople'), who],
    [t('xPeriod'), `${from || '—'}${getLang() === 'ja' ? ' 〜 ' : ' – '}${to || '—'}`],
    [t('xCount'), recs.length],
    [t('xApp'), `DENTMAN's Toothbrush Challenge ${appVersion}`],
  ]);
  ws3['!cols'] = [{ wch: 18 }, { wch: 60 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, t('xSheetRecords').slice(0, 31));
  XLSX.utils.book_append_sheet(wb, ws2, t('xSheetSummary').slice(0, 31));
  XLSX.utils.book_append_sheet(wb, ws3, t('xSheetConditions').slice(0, 31));
  const p = n => String(n).padStart(2, '0');
  const file = `hamigaki_records_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}.xlsx`;
  XLSX.writeFile(wb, file, { compression: true });
  return { count: recs.length, people: ids.length, file };
}
