// 數值驗證 — index.html（兩個計算器）同 app.html（建立／編輯 project、按揭、律師記錄）共用。
// 普通 <script>，共用全域，唔依賴其他檔。
//
// 原則：空白＝未填，唔會靜靜哋變成預設值（之前 `+value || 450` 令留空／0 變 450、
// 負數直接計）；超出範圍就即刻喺欄位下面顯示原因，唔好計出離譜數字。
// HTML 嘅 min／max 屬性只係畀 spinner 同瀏覽器提示用，打字入去嘅負數照樣會過，所以一定要 JS 驗證。

const LIMITS = {
  size:       { label: '實用面積',   unit: '呎', min: 100, max: 3000, integer: true },  // 同 input min/max 一致
  budget:     { label: '預算上限',   unit: '$',  min: 0, max: 1e9, integer: true },
  price:      { label: '樓價',       unit: '$',  min: 0, max: 1e9, integer: true },
  downPct:    { label: '首期',       unit: '%',  min: 0, max: 100 },
  loan:       { label: '貸款額',     unit: '$',  min: 0, max: 1e9, integer: true },
  ratePct:    { label: '利率',       unit: '%',  min: 0, max: 30 },
  years:      { label: '年期',       unit: '年', min: 1, max: 50, integer: true },  // reno_legal_finance_records.loan_years 係 int
  rebatePct:  { label: '現金回贈',   unit: '%',  min: 0, max: 100 },
  money:      { label: '金額',       unit: '$',  min: 0, max: 1e9, integer: true },
};

function _fmtNum(n) { return Number(n).toLocaleString('en-US'); }
// 範圍文字：「100 – 3,000 呎」「0 – 100%」「$0 – $1,000,000,000」
function _fmtRange(lim) {
  const a = _fmtNum(lim.min), b = _fmtNum(lim.max);
  if (lim.unit === '$') return '$' + a + ' – $' + b;
  if (lim.unit === '%') return a + ' – ' + b + '%';
  return a + ' – ' + b + (lim.unit ? ' ' + lim.unit : '');
}

// raw：輸入框嘅字串。lim：LIMITS 其中一項（可用 { ...LIMITS.money, label: '報價' } 改名）。
// opts.required：true＝空白當錯。回傳 { ok, value, msg }；空白而非必填 → { ok: true, value: null }。
function checkNumber(raw, lim, opts) {
  const required = !!(opts && opts.required);
  const s = (raw === null || raw === undefined) ? '' : String(raw).trim();
  if (s === '') return required ? { ok: false, value: null, msg: '請輸入' + lim.label } : { ok: true, value: null, msg: '' };
  const n = Number(s);
  if (!isFinite(n)) return { ok: false, value: null, msg: lim.label + '要係數字' };
  if (lim.min === 0 && n < 0) return { ok: false, value: null, msg: lim.label + '唔可以係負數' };
  if (n < lim.min || n > lim.max) {
    return { ok: false, value: null, msg: lim.label + '要喺 ' + _fmtRange(lim) + ' 之間' };
  }
  return { ok: true, value: lim.integer ? Math.round(n) : n, msg: '' };
}

// 喺輸入框下面顯示／清走錯誤（持久，唔似 toast 幾秒就消失）。
function setFieldError(el, msg) {
  if (!el) return;
  el.classList.add('is-invalid');
  el.setAttribute('aria-invalid', 'true');
  let box = document.getElementById((el.id || 'fld') + '-err');
  if (!box) {
    box = document.createElement('div');
    box.className = 'field-err';
    box.id = (el.id || 'fld') + '-err';
    box.setAttribute('role', 'alert');
    el.insertAdjacentElement('afterend', box);
  }
  box.textContent = msg;
  el.setAttribute('aria-describedby', box.id);
}
function clearFieldError(el) {
  if (!el) return;
  el.classList.remove('is-invalid');
  el.removeAttribute('aria-invalid');
  const box = document.getElementById((el.id || 'fld') + '-err');
  if (box) box.remove();
  el.removeAttribute('aria-describedby');
}

// 驗證一個輸入框：錯就顯示原因並回傳 null，啱就清走錯誤並回傳 { value }。
function readNumber(el, lim, opts) {
  const r = checkNumber(el.value, lim, opts);
  if (!r.ok) { setFieldError(el, r.msg); return null; }
  clearFieldError(el);
  return { value: r.value };
}
