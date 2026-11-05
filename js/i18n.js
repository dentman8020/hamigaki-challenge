// 画面の文言（日本語・英語・クメール語）。クメール語は現地の方の確認待ち（2026-11-04 ひな訳）。
export const LANGS = [
  { code: 'km', label: 'ខ្មែរ' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

const T = {
  title:        { ja: 'デンタマンの はみがき チャレンジ', en: 'DENTMAN’s Toothbrush Challenge', km: 'ហ្គេមដុសធ្មេញជាមួយ DENTMAN' },
  endHint:      { ja: 'おわったら はブラシを うえに', en: 'Done? Raise your toothbrush', km: 'រួចហើយ? លើកច្រាសដុសធ្មេញឡើង' },
  cheer1:       { ja: 'がんばれ！', en: 'You can do it!', km: 'ព្យាយាមណា!' },
  cheer2:       { ja: 'いいぞ！その ちょうし！', en: 'Great, keep going!', km: 'ល្អណាស់! បន្តទៀត!' },
  cheer3:       { ja: 'ミュータンスくんが よわってきた！', en: 'Mr. Mutans is getting weaker!', km: 'Mr. Mutans កាន់តែខ្សោយហើយ!' },
  showGoal:     { ja: '時計とめやす（3分・星）', en: 'Clock and goal (3 min, stars)', km: 'នាឡិកា និងគោលដៅ (៣ នាទី ផ្កាយ)' },
  goalOn:       { ja: '見せる', en: 'Show', km: 'បង្ហាញ' },
  goalOff:      { ja: '見せない（自分で終わりを決める）', en: 'Hide (child decides when to stop)', km: 'លាក់ (កុមារសម្រេចចិត្តឈប់ដោយខ្លួនឯង)' },
  mutans:       { ja: 'ミュータンスくん', en: 'Mr. Mutans', km: 'Mr. Mutans' },
  beatMutans:   { ja: 'みがいて ミュータンスくんを やっつけよう！', en: 'Brush to beat Mr. Mutans!', km: 'ដុសធ្មេញ ដើម្បីកម្ចាត់ Mr. Mutans!' },
  mutansRan:    { ja: 'ミュータンスくんが にげていった！', en: 'Mr. Mutans ran away!', km: 'Mr. Mutans បានរត់គេចខ្លួនហើយ!' },
  mutansLeft:   { ja: 'ミュータンスくんが まだ いるよ。つぎは 3ぷん みがこう', en: 'Mr. Mutans is still here. Next time, brush for 3 minutes!', km: 'Mr. Mutans នៅតែមាន។ លើកក្រោយ សូមដុស ៣ នាទី!' },
  tagline:      { ja: 'はブラシを たかく あげて スタート！', en: 'Raise your toothbrush high to start!', km: 'លើកច្រាសដុសធ្មេញឡើងខ្ពស់ ដើម្បីចាប់ផ្តើម!' },
  start:        { ja: 'スタート', en: 'Start', km: 'ចាប់ផ្តើម' },
  howto:        { ja: 'あそびかた', en: 'How to play', km: 'របៀបលេង' },
  records:      { ja: 'きろく', en: 'Records', km: 'កំណត់ត្រា' },
  back:         { ja: 'もどる', en: 'Back', km: 'ត្រឡប់' },
  next:         { ja: 'つぎへ', en: 'Next', km: 'បន្ទាប់' },
  ok:           { ja: 'OK', en: 'OK', km: 'យល់ព្រម' },
  yes:          { ja: 'はい', en: 'Yes', km: 'បាទ/ចាស' },
  no:           { ja: 'ちがう', en: 'No', km: 'មិនមែនទេ' },
  cancel:       { ja: 'やめる', en: 'Cancel', km: 'បោះបង់' },

  // 指導前・指導後
  phase:        { ja: 'いまは', en: 'Now', km: 'ឥឡូវនេះ' },
  before:       { ja: '指導前', en: 'Before lesson', km: 'មុនពេលរៀន' },
  after:        { ja: '指導後', en: 'After lesson', km: 'ក្រោយពេលរៀន' },

  // あそびかた
  how1:         { ja: 'はブラシを もって、かたてを あたまの うえに あげよう', en: 'Hold your toothbrush and raise one hand above your head.', km: 'កាន់ច្រាសដុសធ្មេញ ហើយលើកដៃម្ខាងឡើងលើក្បាល។' },
  how2:         { ja: 'おろして、はみがきを はじめよう。ここから じかんを はかるよ', en: 'Bring it down and start brushing. The timer starts now.', km: 'ដាក់ចុះ ហើយចាប់ផ្តើមដុសធ្មេញ។ ម៉ោងចាប់ផ្តើមរាប់ពីពេលនេះ។' },
  how3:         { ja: 'みがきおわったら、くちから だして もういちど うえに あげよう', en: 'When you finish, take it out of your mouth and raise it up again.', km: 'ពេលដុសរួច ដកចេញពីមាត់ ហើយលើកឡើងលើម្តងទៀត។' },
  howTip:       { ja: 'まどを せなかに しないでね。かおが カメラに うつるように すわろう', en: 'Do not sit with a window behind you. Keep your face in the camera.', km: 'កុំអង្គុយបែរខ្នងទៅបង្អួច។ សូមឱ្យមុខនៅក្នុងកាមេរ៉ា។' },
  practice:     { ja: 'れんしゅう：はブラシを うえに あげてみて！', en: 'Practice: raise your toothbrush!', km: 'ហាត់៖ សាកលើកច្រាសដុសធ្មេញឡើង!' },
  practiceOk:   { ja: 'できた！じゅんび オッケー', en: 'Great! You are ready.', km: 'ល្អណាស់! អ្នករួចរាល់ហើយ។' },

  // だれかな
  whoTitle:     { ja: 'だれかな？ カメラを みてね', en: 'Who are you? Look at the camera.', km: 'តើអ្នកជានរណា? សូមមើលកាមេរ៉ា។' },
  looking:      { ja: 'かおを さがしているよ…', en: 'Looking for your face…', km: 'កំពុងរកមុខរបស់អ្នក…' },
  noFace:       { ja: 'かおが みえないよ。カメラの まえに きてね', en: 'I cannot see your face. Come in front of the camera.', km: 'មើលមុខមិនឃើញទេ។ សូមមកនៅមុខកាមេរ៉ា។' },
  manyFaces:    { ja: 'ひとりずつ うつってね', en: 'One person at a time, please.', km: 'សូមម្នាក់ម្តងៗ។' },
  isThis:       { ja: 'さん ですか？', en: '— is this you?', km: ' មែនទេ?' },
  pickWho:      { ja: 'なまえを えらんでね', en: 'Choose your name', km: 'សូមជ្រើសរើសឈ្មោះរបស់អ្នក' },
  newPlayer:    { ja: 'はじめての ひと', en: 'New player', km: 'អ្នកលេងថ្មី' },
  name:         { ja: 'なまえ（よびな）', en: 'Name (nickname)', km: 'ឈ្មោះ (ឈ្មោះហៅក្រៅ)' },
  regTitle:     { ja: 'かおを おぼえるよ', en: 'Learning your face', km: 'កំពុងចងចាំមុខរបស់អ្នក' },
  regHint:      { ja: 'カメラを みて、かおを すこし みぎ・ひだりに うごかしてね', en: 'Look at the camera and turn your head a little left and right.', km: 'មើលកាមេរ៉ា ហើយបែរក្បាលទៅឆ្វេង និងស្តាំបន្តិច។' },
  regDone:      { ja: 'おぼえたよ！', en: 'Got it!', km: 'ចាំបានហើយ!' },
  regSame:      { ja: 'この かおは もう とうろく されているかも：', en: 'This face may already be registered:', km: 'មុខនេះប្រហែលជាបានចុះឈ្មោះរួចហើយ៖' },
  register:     { ja: 'とうろく', en: 'Register', km: 'ចុះឈ្មោះ' },

  // みがく
  hello:        { ja: 'さん、がんばろう！', en: ', let’s go!', km: ' តោះ!' },
  raiseToStart: { ja: 'はブラシを あたまの うえに あげて スタート', en: 'Raise your toothbrush above your head to start', km: 'លើកច្រាសដុសធ្មេញឡើងលើក្បាល ដើម្បីចាប់ផ្តើម' },
  keepUp:       { ja: 'そのまま！', en: 'Hold it!', km: 'កាន់ឱ្យនៅដដែល!' },
  lowerToBrush: { ja: 'おろして みがきはじめよう！', en: 'Bring it down and start brushing!', km: 'ដាក់ចុះ ហើយចាប់ផ្តើមដុស!' },
  brushing:     { ja: 'みがいているよ', en: 'Brushing', km: 'កំពុងដុសធ្មេញ' },
  // raiseToEnd は v7 から磨く画面の帯では使わない（やめる合図になるため）。言い回しの控えとして残す
  raiseToEnd:   { ja: 'おわったら はブラシを うえに あげてね', en: 'When you finish, raise your toothbrush up', km: 'ពេលដុសរួច សូមលើកច្រាសដុសធ្មេញឡើង' },
  tooEarly:     { ja: 'まだ はじまった ばかりだよ', en: 'You just started!', km: 'ទើបតែចាប់ផ្តើមទេ!' },
  outOfView:    { ja: 'カメラに もどってきてね', en: 'Come back to the camera', km: 'សូមត្រឡប់មកមុខកាមេរ៉ាវិញ' },
  staffStart:   { ja: '手で開始', en: 'Start (staff)', km: 'ចាប់ផ្តើម (បុគ្គលិក)' },
  staffStop:    { ja: '手で終了', en: 'Stop (staff)', km: 'បញ្ឈប់ (បុគ្គលិក)' },
  quit:         { ja: 'やめる', en: 'Quit', km: 'ឈប់' },

  // けっか
  done:         { ja: 'おつかれさま！', en: 'Great job!', km: 'ល្អណាស់!' },
  yourTime:     { ja: 'みがいた じかん', en: 'Brushing time', km: 'រយៈពេលដុសធ្មេញ' },
  min:          { ja: 'ふん', en: 'min', km: 'នាទី' },
  sec:          { ja: 'びょう', en: 'sec', km: 'វិនាទី' },
  lastBefore:   { ja: '指導前の へいきん', en: 'Average before lesson', km: 'មធ្យមភាគមុនពេលរៀន' },
  lastAfter:    { ja: '指導後の へいきん', en: 'Average after lesson', km: 'មធ្យមភាគក្រោយពេលរៀន' },
  longer:       { ja: 'ながく みがけたね！', en: 'You brushed longer!', km: 'អ្នកដុសបានយូរជាងមុន!' },
  goal:         { ja: 'めやすは 3ぷん', en: 'Goal: 3 minutes', km: 'គោលដៅ៖ ៣ នាទី' },
  goalReached:  { ja: '3ぷん たっせい！', en: '3 minutes — you did it!', km: 'បាន ៣ នាទីហើយ!' },
  again:        { ja: 'もういちど', en: 'Play again', km: 'លេងម្តងទៀត' },
  toTitle:      { ja: 'さいしょへ', en: 'Home', km: 'ទំព័រដើម' },
  endedLost:    { ja: '（とちゅうで カメラから いなくなったので おわりに したよ）', en: '(Ended because you left the camera.)', km: '(បានបញ្ចប់ ព្រោះអ្នកចាកចេញពីកាមេរ៉ា។)' },
  endedTimeout: { ja: '（10ぷんを こえたので おわりに したよ）', en: '(Stopped after 10 minutes.)', km: '(បានបញ្ឈប់ក្រោយ ១០ នាទី។)' },

  // きろく
  recTitle:     { ja: 'きろく（指導前と指導後）', en: 'Records (before / after lesson)', km: 'កំណត់ត្រា (មុន / ក្រោយពេលរៀន)' },
  noRecords:    { ja: 'まだ きろくが ありません', en: 'No records yet', km: 'មិនទាន់មានកំណត់ត្រាទេ' },
  times:        { ja: 'かい', en: 'times', km: 'ដង' },
  change:       { ja: 'へんか', en: 'Change', km: 'ការប្រែប្រួល' },
  avg:          { ja: 'へいきん', en: 'Average', km: 'មធ្យមភាគ' },
  allRecords:   { ja: 'ぜんぶの きろく', en: 'All records', km: 'កំណត់ត្រាទាំងអស់' },
  exportCsv:    { ja: 'CSV に書き出す', en: 'Export CSV', km: 'នាំចេញ CSV' },
  backupJson:   { ja: '控えを保存（顔データ入り）', en: 'Save backup (includes face data)', km: 'រក្សាទុកច្បាប់ចម្លង (មានទិន្នន័យមុខ)' },
  restoreJson:  { ja: '控えから戻す', en: 'Restore backup', km: 'ស្តារពីច្បាប់ចម្លង' },
  deletePerson: { ja: 'この人を消す', en: 'Delete this person', km: 'លុបមនុស្សនេះ' },
  deleteRecord: { ja: '消す', en: 'Delete', km: 'លុប' },
  wipeAll:      { ja: 'すべて消す', en: 'Delete everything', km: 'លុបទាំងអស់' },
  confirmDel:   { ja: '本当に消しますか？元に戻せません', en: 'Really delete? This cannot be undone.', km: 'ពិតជាចង់លុបមែនទេ? មិនអាចយកមកវិញបានទេ។' },
  adultGate:    { ja: 'おとなの人へ：こたえを えらんでください', en: 'For adults: choose the answer', km: 'សម្រាប់មនុស្សពេញវ័យ៖ សូមជ្រើសរើសចម្លើយ' },
  privacy:      { ja: '顔の情報は この端末の中だけに保存し、外には送りません。', en: 'Face data is stored only on this device and never sent anywhere.', km: 'ទិន្នន័យមុខត្រូវបានរក្សាទុកតែក្នុងឧបករណ៍នេះប៉ុណ្ណោះ ហើយមិនផ្ញើទៅកន្លែងណាទេ។' },

  // カメラ・読み込み
  loading:      { ja: 'じゅんびちゅう…', en: 'Getting ready…', km: 'កំពុងរៀបចំ…' },
  camError:     { ja: 'カメラが つかえません。カメラの きょかを たしかめてください', en: 'Camera is not available. Please check camera permission.', km: 'មិនអាចប្រើកាមេរ៉ាបានទេ។ សូមពិនិត្យការអនុញ្ញាតកាមេរ៉ា។' },
  restoreError: { ja: '控えのファイルを読めませんでした', en: 'Could not read the backup file', km: 'មិនអាចអានឯកសារច្បាប់ចម្លងបានទេ' },
  ended_gesture:{ ja: '↑ で終了', en: 'Ended by raising', km: 'បញ្ចប់ដោយលើកដៃ' },
  ended_manual: { ja: '手で終了', en: 'Stopped by staff', km: 'បញ្ឈប់ដោយបុគ្គលិក' },
  ended_lost:   { ja: '中断（カメラから外れた）', en: 'Left the camera', km: 'ចាកចេញពីកាមេរ៉ា' },
  ended_timeout:{ ja: '10分で自動終了', en: 'Auto-stopped at 10 min', km: 'បញ្ឈប់ស្វ័យប្រវត្តិ ១០ នាទី' },
  modelError:   { ja: 'よみこみに しっぱいしました', en: 'Failed to load', km: 'ផ្ទុកមិនបានសម្រេច' },
};

let lang = 'km';
export function setLang(code) {
  lang = LANGS.some(l => l.code === code) ? code : 'km';
  document.documentElement.lang = lang;
}
export function getLang() { return lang; }
export function t(key) { return T[key]?.[lang] ?? T[key]?.en ?? key; }

// クメール数字（០-៩）。クメール語の画面では時間もクメール数字で見せる
const KM_DIGITS = '០១២៣៤៥៦៧៨៩';
export function num(n) {
  const s = String(n);
  return lang === 'km' ? s.replace(/[0-9]/g, d => KM_DIGITS[d]) : s;
}

// ms → 「2ふん 05びょう」
export function fmtDuration(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60), s = total % 60;
  if (m === 0) return `${num(s)} ${t('sec')}`;
  return `${num(m)} ${t('min')} ${num(String(s).padStart(2, '0'))} ${t('sec')}`;
}
// ms → 「2:05」（計測中の大きな数字）
export function fmtClock(ms) {
  const total = Math.floor(ms / 1000);
  return `${num(Math.floor(total / 60))}:${num(String(total % 60).padStart(2, '0'))}`;
}

// data-i18n="key" の要素を一斉に書き換える
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}
