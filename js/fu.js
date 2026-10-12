// 「拆伏」主題（2026-10-13）— app 同 landing 共用同一套 4 種伏。
// 純函數＋少量 DOM，唔碰 supabase。全部由 app 已有資料計算，唔使改資料庫：
//   報價紅旗（FLAGS，content.js）→ 4 種伏；「今日」頁伏圖鑑；驗收完防水彈慶祝卡。
// 依賴（全域）：FLAGS、esc（app.html）。
const FU_DEFS = {
  price: { img: 'img/landing/fu_price.webp', name: '加價單伏',   trap: '開工後加價' },
  ghost: { img: 'img/landing/fu_ghost.webp', name: '走佬師傅伏', trap: '訂金過重、公司唔可靠' },
  delay: { img: 'img/landing/fu_delay.webp', name: '甩期伏',     trap: '工期冇保障' },
  leak:  { img: 'img/landing/fu_leak.webp',  name: '漏水伏',     trap: '防水偷工' },
};
// 10 條報價紅旗 → 伏（落喺邊種伏下面）
const FLAG_FU = {
  no_br: 'ghost', deposit_over20: 'ghost',
  no_itemize: 'price', no_brand: 'price', misc_over5: 'price', below_market: 'price', verbal_promise: 'price',
  no_timeline: 'delay', no_penalty: 'delay',
  no_warranty: 'leak',
};

// 一份報價：剔中邊啲紅旗、對應邊啲伏
function quoteFuSummary(q) {
  const flags = (q && q.flags) || {};
  const hits = FLAGS.filter(f => flags[f.key]).map(f => ({ key: f.key, label: f.label, fu: FLAG_FU[f.key] || 'price' }));
  const kinds = [];
  hits.forEach(h => { if (!kinds.includes(h.fu)) kinds.push(h.fu); });
  return { hits, kinds };
}

// 「今日」頁伏圖鑑：4 格，每格 { key, done, sub, hash }
// quotes：主報價（唔計合約、額外工程報價）；stages：reno_stages 列；project：開工日期
function computeFuDex(project, quotes, stages) {
  const main = (quotes || []).filter(q => !(q.flags && (q.flags._kind === 'contract' || q.flags._quote_for)));
  const signed = main.find(q => q.status === 'signed');
  const best = signed || main.slice().sort((a, b) => scoreOf(b) - scoreOf(a))[0] || null;   // 未簽就以最高分嗰份做參考
  const sum = best ? quoteFuSummary(best) : null;
  const n = (k) => sum ? sum.hits.filter(h => h.fu === k).length : 0;
  const who = best ? best.company : '';
  const contract = (quotes || []).find(q => q.status === 'signed' && q.flags && q.flags._kind === 'contract');   // 已簽主合約但冇逐份記錄比較報價
  const viaContract = !best && !!contract;

  const price = viaContract ? { done: true, sub: '已簽主合約' } : !best ? { done: false, sub: '未有報價' }
    : main.length < 3 ? { done: false, sub: `只有 ${main.length} 份報價` }
    : n('price') ? { done: false, sub: `${who} ${n('price')} 個價錢紅旗` }
    : { done: true, sub: '報價夠比較、冇價錢紅旗' };
  const ghost = viaContract ? { done: true, sub: '已簽主合約' } : !best ? { done: false, sub: '未有報價' }
    : n('ghost') ? { done: false, sub: `${who} ${n('ghost')} 個付款／資格紅旗` }
    : { done: true, sub: '付款期同資格冇紅旗' };
  const hasStart = !!(project && project.start_date);
  const delay = viaContract ? { done: false, sub: '核對合約工期同延誤條款' } : !best ? { done: false, sub: '未有報價' }
    : n('delay') ? { done: false, sub: `${who} 冇寫工期／延誤條款` }
    : !hasStart ? { done: false, sub: '未設開工日期' }
    : { done: true, sub: '工期同延誤條款有寫明' };
  const wet = (stages || []).find(s => s.key === 'wet');
  const leakDone = !!(wet && wet.finished_on && wet.inspected_on);
  const leak = { done: leakDone, sub: leakDone ? '泥水防水已驗收' : '泥水防水未驗收' };

  return [
    Object.assign({ key: 'price', hash: '#/quotes' }, price),
    Object.assign({ key: 'ghost', hash: '#/quotes' }, ghost),
    Object.assign({ key: 'delay', hash: (best && !n('delay') && !hasStart) ? '#/dashboard' : '#/quotes' }, delay),
    Object.assign({ key: 'leak', hash: '#/build' }, leak),
  ];
}
function scoreOf(q) { return q.score !== null && q.score !== undefined ? q.score : computeQuoteScore(q.flags); }

function fuDexHtml(dex) {
  const done = dex.filter(d => d.done).length;
  return `<div class="card fx-dex"><div class="rowflex"><h3>你間屋嘅伏</h3><span class="fx-count">${done === dex.length ? '全部拆晒 🎉' : `已拆 ${done}／${dex.length}`}</span></div>
    <div class="fx-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${dex.length}" aria-valuenow="${done}"><i style="width:${done / dex.length * 100}%"></i></div>
    <div class="fx-slots">${dex.map(d => `<button type="button" class="fx-slot ${d.done ? 'done' : 'open'}" data-fuhash="${d.hash}" aria-label="${FU_DEFS[d.key].name}：${d.done ? '已拆' : '未拆'}，${esc(d.sub)}">
      <img src="${FU_DEFS[d.key].img}" alt=""><b>${FU_DEFS[d.key].name}</b><small>${esc(d.sub)}</small></button>`).join('')}</div></div>`;
}

// 報價卡：頂部「呢間有 x 種伏」＋紅旗標籤
function quoteFuHeadHtml(q) {
  const { hits, kinds } = quoteFuSummary(q);
  if (!hits.length) return '<div class="fx-fuhead"><span class="fx-fucount zero">✓ 冇伏，安全</span></div>';
  const cls = hits.length >= 3 ? 'many' : 'few';
  return `<div class="fx-fuhead"><div class="fx-fustack">${kinds.map(k => `<img src="${FU_DEFS[k].img}" alt="">`).join('')}</div><span class="fx-fucount ${cls}">呢間有 ${kinds.length} 種伏、${hits.length} 個紅旗</span></div>`;
}
function quoteFlagChipsHtml(q) {
  const { hits } = quoteFuSummary(q);
  if (!hits.length) return '';
  const shown = hits.slice(0, 3), rest = hits.length - shown.length;
  return `<div class="fx-flags">${shown.map(h => `<span class="fx-flag"><img src="${FU_DEFS[h.fu].img}" alt="">${esc(h.label)}</span>`).join('')}${rest > 0 ? `<span class="fx-flagmore">+${rest} 項</span>` : ''}</div>`;
}

// 慶祝卡：短暫彈出，3.2 秒後自動收起（reduced-motion 就直接顯示／收起，冇動畫）
let _celebrateT;
function celebrateFu(fuKey, line) {
  const def = FU_DEFS[fuKey]; if (!def) return;
  let el = document.getElementById('fxCelebrate');
  if (!el) { el = document.createElement('div'); el.id = 'fxCelebrate'; el.className = 'fx-celebrate'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<img src="${def.img}" alt=""><div><b>拆！${def.name} ✓</b><span>${esc(line)}</span></div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(_celebrateT); _celebrateT = setTimeout(() => el.classList.remove('show'), 3200);
}

// ---------- 第 2 批 ----------
// 按屋種提醒：每種屋 3 隻「專屬伏」（同 landing 揀屋嗰幾隻一致；公屋／居屋字眼保守，只講要向房署／法團問清楚）
const FLAT_HINTS = {
  old: { img: 'img/landing/tonglau.webp', title: '舊樓／唐樓', traps: [
    ['leak',  '樓上滲水伏',   '天花水漬好多時係樓上滲落嚟。開工前先同樓上／法團傾，搵到源頭先執。'],
    ['price', '搬運費伏',     '冇電梯、人手搬料上樓，師傅開工後先講搬運費。報價要寫埋搬運同垃圾清運。'],
    ['delay', '電線老化伏',   '舊樓電線容量唔夠，易「開咗先發現要換總掣」。報價前叫師傅睇電錶房，寫明換線範圍。'] ] },
  private: { img: 'img/landing/estate.webp', title: '私樓／屋苑', traps: [
    ['ghost', '管理處按金伏', '屋苑有裝修守則：開工時間、按金、搬運升降機要預約。師傅唔跟守則，扣嘅係你按金。'],
    ['delay', '公用部分伏',   '窗、冷氣機位、外牆屬公用部分，郁之前要向管理處申請。審批時間要計入工期。'],
    ['price', '噪音時段伏',   '大部分屋苑只准平日指定時間做嘈音工序，工期會長過師傅口講，預多一兩個星期。'] ] },
  hos: { img: 'img/landing/estate.webp', title: '居屋（清水房）', traps: [
    ['price', '清水房漏項伏', '清水房由零開始，水電、防水、批盪全部要自己安排，最易漏項。報價要逐項對清楚先簽。'],
    ['ghost', '守則按金伏',   '開工前向屋苑管理處問清楚裝修守則、按金同時間；唔跟守則會被扣按金或叫停。'],
    ['leak',  '防水伏',       '清水房浴室廚房由零開始做防水，一定要 48 小時試水合格先鋪磚。'] ] },
  public: { img: 'img/landing/estate.webp', title: '公屋', traps: [
    ['ghost', '房署規定伏',   '公屋有房署嘅裝修指引：邊啲工程准做、邊啲要申請，開工前先問清楚，唔好信師傅一句「冇問題」。'],
    ['delay', '審批工期伏',   '要申請嘅工程要等批准先開工，審批時間要計入工期，唔好先訂料先問。'],
    ['price', '細單位加價伏', '單位細，師傅容易以「難做」為由加價。報價逐項列明，加減工程書面確認。'] ] },
};
function flatHintHtml(project) {
  const h = FLAT_HINTS[project && project.flat_type]; if (!h) return '';
  return `<div class="card fx-flat"><div class="rowflex"><h3>你間${esc(h.title)}要留意</h3></div>
    ${h.traps.map(t => `<div class="fx-flatrow"><img src="${FU_DEFS[t[0]].img}" alt=""><div><b>${esc(t[1])}</b><span>${esc(t[2])}</span></div></div>`).join('')}</div>`;
}

// 額外工程佔主合約比例：≥10% 提醒、≥15% 紅色（一般應急錢預 10–15%）
function extraWorksAlert(mainTotal, extraTotal) {
  mainTotal = +mainTotal || 0; extraTotal = +extraTotal || 0;
  if (mainTotal <= 0 || extraTotal <= 0) return null;
  const pct = Math.round(extraTotal / mainTotal * 100);
  if (pct < 10) return null;
  return { pct, level: pct >= 15 ? 'high' : 'mid', main: mainTotal, extra: extraTotal };
}
function extraWorksAlertHtml(a, fmt) {
  if (!a) return '';
  return `<div class="fx-extra ${a.level}" role="status"><img src="${FU_DEFS.price.img}" alt=""><div><b>加價單伏：額外工程已佔主合約 ${a.pct}%</b><span>${fmt(a.extra)}／${fmt(a.main)}。應急錢一般預 10–15%，${a.level === 'high' ? '已經超出，逐項睇下邊啲係真係需要、邊啲可以唔做。' : '快用晒喇，之後再加要小心。'}</span></div></div>`;
}

// 施工相前後對比（第一張 vs 最新一張）
function stageCompareHtml(photos) {
  if (!photos || photos.length < 2) return '';
  const a = photos[0], b = photos[photos.length - 1];
  return `<div class="fx-cmp" style="--x:50%"><img src="${a.url}" alt="最早嘅施工相"><img class="aft" src="${b.url}" alt="最新嘅施工相">
    <span class="lab l">最早</span><span class="lab r">最新</span><div class="bar"></div><div class="knob" aria-hidden="true">⇆</div>
    <input type="range" min="0" max="100" value="50" aria-label="拖動比較最早同最新施工相"></div>`;
}
function bindStageCompare(root) {
  root.querySelectorAll('.fx-cmp input').forEach(r => r.addEventListener('input', () => r.parentElement.style.setProperty('--x', r.value + '%')));
}

// 其他關鍵工序慶祝（防水另有 celebrateFu('leak')）：用公仔
function celebrateStage(stageKey) {
  const M = {
    me:    ['拆！水電入牆前驗收 ✓', '隱蔽工程驗收完先好封牆。每個位影低相留底，之後有事先有憑據。'],
    clean: ['🎉 全屋完工驗收', '執漏清單要書面列明限期；尾數留到執漏完成先付最穩陣。'],
  }[stageKey];
  if (!M) return;
  let el = document.getElementById('fxCelebrate');
  if (!el) { el = document.createElement('div'); el.id = 'fxCelebrate'; el.className = 'fx-celebrate'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<img src="img/landing/mascot.webp" alt=""><div><b>${esc(M[0])}</b><span>${esc(M[1])}</span></div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(_celebrateT); _celebrateT = setTimeout(() => el.classList.remove('show'), 3600);
}
