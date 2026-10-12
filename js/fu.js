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

  const price = !best ? { done: false, sub: '未有報價' }
    : main.length < 3 ? { done: false, sub: `只有 ${main.length} 份報價` }
    : n('price') ? { done: false, sub: `${who} ${n('price')} 個價錢紅旗` }
    : { done: true, sub: '報價夠比較、冇價錢紅旗' };
  const ghost = !best ? { done: false, sub: '未有報價' }
    : n('ghost') ? { done: false, sub: `${who} ${n('ghost')} 個付款／資格紅旗` }
    : { done: true, sub: '付款期同資格冇紅旗' };
  const hasStart = !!(project && project.start_date);
  const delay = !best ? { done: false, sub: '未有報價' }
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
