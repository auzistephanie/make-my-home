// #/legal — 律師／按揭記錄（Task 2）。由 app.html 搬出嚟（2026-10-11，拆細 app.html 第二個 module）。
// 普通 <script>（唔係 ES module），共用全域，同 spending.js／db.js 一樣。依賴 app.html 內嘅
// state／appEl／guard／resolveProjects／chromeShell／projectRowHtml／attachChromeEvents／money／esc／toast，
// 同 db.js 嘅 listLegalFinanceRecords／createLegalFinanceRecord／updateLegalFinanceRecord／deleteLegalFinanceRecord。
// 全部喺 route 觸發 render 時先叫用，所以 <script> 載入次序唔影響。

const LAWYER_STATUS = ['已聯絡', '報價中', '已落實', '完成'];
const MORTGAGE_STATUS = ['申請中', '已批核', '已落實', '完成'];
const LEGAL_TABS = [
  { key: 'mortgage', label: '按揭' },
  { key: 'lawyer', label: '律師' },
];

// 香港置業參考數字。2026-10-13 對過官方頁。呢個檔之前冇寫死印花稅、按揭成數或利率
// （表單只係記用家自己填嘅數）。下面先至係現行官方數字，註解入面嘅「舊數」係已被取代嘅法例／監管數字。
//
// 買家印花稅 BSD：非永久居民舊稅率 15% → 2024-02-28 上午 11 時起 0%。
// 額外印花稅 SSD：24 個月內轉售舊稅率最高 20% → 同日 0%（係調低稅率，條文仲喺度）。
//   https://www.ird.gov.hk/eng/faq/dsmm.htm
//   https://www.ird.gov.hk/eng/pdf/sdo/gazette/es1202428168.pdf
// 從價印花稅 AVD：2024-02-28 起第 1 標準第 1 部同第 2 標準同一套稅率（舊嘅劃一 15%／7.5% 已唔適用）。
//   2025-02-26 起 $100 稅階上限由 $3,000,000 提升到 $4,000,000。
//   2026-02-26 起住宅最高稅率由 4.25% 改為：超過 $100,000,000 有 30% 邊際寬減，
//   $109,574,471 或以上係 6.5%。非住宅用新嘅第 3 標準，最高仍然 4.25%。
//   稅款有角分就進位到最接近嘅 $1。
//   https://www.ird.gov.hk/eng/faq/avd.htm
//   https://www.gov.hk/en/residents/taxes/stamp/stamp_duty_rates.htm
// 按揭成數／供款比率／年期：2024-02-28 嗰套（例如樓價 $3,500 萬以上自住最高 60%、
//   已有按揭再減 10 個百分點）已於 2024-10-16 被取代。現行劃一：成數 70%、供款與入息比率 50%、
//   物業年期 30 年、車位 15 年。2026-10-13 金管局消費者頁仍然係呢組數字。
//   https://www.hkma.gov.hk/eng/smart-consumers/mortgages/
//   https://www.hkma.gov.hk/eng/news-and-media/press-releases/2024/10/20241016-4/
// 加息壓力測試：舊規定假設按揭利率再升 2 個百分點（200 點子）。2024-02-28 起暫停，未立法取消。
//   https://www.hkma.gov.hk/eng/news-and-media/press-releases/2024/02/20240228-3/
// 按揭保險（可高過銀行七成）：https://www.hkmc.com.hk/eng/our_business/mortgage_insurance_programme.html
// 滙豐港元最優惠利率：5.125%（2025-09-19）→ 5.00%（2025-10-31 起）。2026-09-17 宣布維持 5.00%。
//   呢個係參考利率，唔係按揭計劃利率（H 按／P 按由銀行報價）。
//   https://www.hsbc.com.hk/zh-hk/investments/market-information/hk/lending-rate/
//   https://www.about.hsbc.com.hk/zh-hk/news-and-media/hsbc-maintains-its-best-lending-rate-at-5-00-per-cent-in-hong-kong-september
const HK_LEGAL_UPDATED = '2026年10月13日';
const HK_LEGAL = {
  bsdPct: 0,
  ssdPct: 0,
  avdFlatUpTo: 4000000,
  avdTopPct: 6.5,
  avdTopFrom: 109574471,
  nonResTopPct: 4.25,
  ltvPct: 70,
  dsrPct: 50,
  maxTenorYears: 30,
  carparkTenorYears: 15,
  stressTestSuspended: true,
  hsbcPrimePct: 5,
};

// 住宅從價印花稅（2026-02-26 起，第 1 標準第 1 部＝第 2 標準）。upTo 包尾。
const AVD_RESIDENTIAL_BANDS = [
  { upTo: 4000000, kind: 'flat', duty: 100, label: '$4,000,000 或以下', rate: '$100' },
  { upTo: 4323780, kind: 'marginal', base: 100, excessOver: 4000000, num: 20, den: 100, label: '$4,000,001 – $4,323,780', rate: '$100＋超出 $4,000,000 嘅 20%' },
  { upTo: 4500000, kind: 'pct', num: 15, den: 1000, label: '$4,323,781 – $4,500,000', rate: '1.50%' },
  { upTo: 4935480, kind: 'marginal', base: 67500, excessOver: 4500000, num: 10, den: 100, label: '$4,500,001 – $4,935,480', rate: '$67,500＋超出 $4,500,000 嘅 10%' },
  { upTo: 6000000, kind: 'pct', num: 225, den: 10000, label: '$4,935,481 – $6,000,000', rate: '2.25%' },
  { upTo: 6642860, kind: 'marginal', base: 135000, excessOver: 6000000, num: 10, den: 100, label: '$6,000,001 – $6,642,860', rate: '$135,000＋超出 $6,000,000 嘅 10%' },
  { upTo: 9000000, kind: 'pct', num: 3, den: 100, label: '$6,642,861 – $9,000,000', rate: '3.00%' },
  { upTo: 10080000, kind: 'marginal', base: 270000, excessOver: 9000000, num: 10, den: 100, label: '$9,000,001 – $10,080,000', rate: '$270,000＋超出 $9,000,000 嘅 10%' },
  { upTo: 20000000, kind: 'pct', num: 375, den: 10000, label: '$10,080,001 – $20,000,000', rate: '3.75%' },
  { upTo: 21739120, kind: 'marginal', base: 750000, excessOver: 20000000, num: 10, den: 100, label: '$20,000,001 – $21,739,120', rate: '$750,000＋超出 $20,000,000 嘅 10%' },
  { upTo: 100000000, kind: 'pct', num: 425, den: 10000, label: '$21,739,121 – $100,000,000', rate: '4.25%' },
  { upTo: 109574470, kind: 'marginal', base: 4250000, excessOver: 100000000, num: 30, den: 100, label: '$100,000,001 – $109,574,470', rate: '$4,250,000＋超出 $100,000,000 嘅 30%' },
  { upTo: Infinity, kind: 'pct', num: 65, den: 1000, label: '$109,574,471 或以上', rate: '6.50%' },
];

// 按揭保險計劃樓價上限（高過銀行七成嗰截）。90% 只限所有業主申請時冇香港住宅，
// 而且全部申請人係固定受薪。$1,715 萬以上至 $3,000 萬嘅七成只適用 2024-10-16 之前簽嘅臨約。
const MIP_BANDS = [
  { label: '$1,000 萬或以下', rate: '80% 或 90%' },
  { label: '$1,000 萬以上至 $1,125 萬以下', rate: '80%–90%（貸款上限 $900 萬）' },
  { label: '$1,125 萬至 $1,500 萬', rate: '80%' },
  { label: '$1,500 萬以上至 $1,715 萬', rate: '70–80%（貸款額上限 $1,200 萬）' },
  { label: '$1,715 萬以上至 $3,000 萬', rate: '70%（只限 2024-10-16 前嘅臨約）' },
];

function _ceilRatio(amount, num, den) {
  return Math.floor((amount * num + den - 1) / den);
}

// 住宅從價印花稅（港元，進位到 $1）。price ≤ 0 或唔係數字就回傳 null。
function residentialAvd(price) {
  const p = +price;
  if (!isFinite(p) || p <= 0) return null;
  for (let i = 0; i < AVD_RESIDENTIAL_BANDS.length; i++) {
    const band = AVD_RESIDENTIAL_BANDS[i];
    if (p > band.upTo) continue;
    if (band.kind === 'flat') return band.duty;
    if (band.kind === 'pct') return _ceilRatio(p, band.num, band.den);
    return band.base + _ceilRatio(p - band.excessOver, band.num, band.den);
  }
  return null;
}

function legalReferenceHtml() {
  const src = 'text-decoration:underline';
  const avdRows = AVD_RESIDENTIAL_BANDS.map(b => `<tr><td>${b.label}</td><td>${b.rate}</td></tr>`).join('');
  const mipRows = MIP_BANDS.map(b => `<tr><td>${b.label}</td><td>${b.rate}</td></tr>`).join('');
  return `<div class="card" id="legal-ref">
    <h3 id="legal-ref-title">香港置業參考數字</h3>
    <p class="dt" id="legal-updated">最後更新：${HK_LEGAL_UPDATED}</p>
    <p class="dt">只供教育參考，唔構成稅務、按揭或法律意見。樓價用代價同市值嘅較高者計稅；個別豁免、多於一個住宅、公司持有，以稅務局評稅為準。</p>
    <div class="tbwrap">
      <table class="tb" style="min-width:0">
        <caption class="sr-only">2026年10月現行印花稅同按揭上限</caption>
        <tr><th style="white-space:normal">項目</th><th style="white-space:normal">現行數字</th></tr>
        <tr><td>買家印花稅（BSD）</td><td>${HK_LEGAL.bsdPct}%（2024年2月28日上午11時起）</td></tr>
        <tr><td>額外印花稅（SSD）</td><td>${HK_LEGAL.ssdPct}%（同一時間起）</td></tr>
        <tr><td>從價印花稅（住宅）</td><td>$${HK_LEGAL.avdFlatUpTo.toLocaleString()} 或以下 $100；$${HK_LEGAL.avdTopFrom.toLocaleString()} 或以上 ${HK_LEGAL.avdTopPct}%。第1標準第1部同第2標準而家同一套稅率。</td></tr>
        <tr><td>從價印花稅（非住宅）</td><td>第3標準，最高 ${HK_LEGAL.nonResTopPct}%（2026年2月26日起）</td></tr>
        <tr><td>銀行按揭成數上限</td><td>${HK_LEGAL.ltvPct}%（即首期至少 ${100 - HK_LEGAL.ltvPct}%），唔分樓價同自住</td></tr>
        <tr><td>供款與入息比率上限</td><td>${HK_LEGAL.dsrPct}%</td></tr>
        <tr><td>按揭年期上限</td><td>物業 ${HK_LEGAL.maxTenorYears} 年；獨立車位 ${HK_LEGAL.carparkTenorYears} 年</td></tr>
        <tr><td>加息壓力測試</td><td>${HK_LEGAL.stressTestSuspended ? '暫停（舊規定假設利率再升 2 個百分點；2024年2月28日起暫停，未取消）' : '適用'}</td></tr>
        <tr><td>滙豐港元最優惠利率</td><td>${HK_LEGAL.hsbcPrimePct.toFixed(2)}%（2026年9月17日維持；上次改動 2025年10月31日）</td></tr>
      </table>
    </div>
    <p class="dt">銀行按揭計劃利率唔係法定劃一數字。H 按一般係銀行同業拆息加息差，P 按係最優惠利率減息差，以貸款信為準。律師費亦冇法定劃一收費，以律師行報價為準。按揭保險計劃符合資格先可以高過七成。</p>
    <details>
      <summary style="min-height:44px;padding:12px 0;cursor:pointer">展開住宅從價印花稅稅階同按揭保險上限</summary>
      <div class="tbwrap">
        <table class="tb" style="min-width:0">
          <caption class="sr-only">住宅從價印花稅稅階（2026年2月26日起）</caption>
          <tr><th style="white-space:normal">樓價或市值（較高者）</th><th style="white-space:normal">稅率</th></tr>
          ${avdRows}
        </table>
      </div>
      <div class="tbwrap">
        <table class="tb" style="min-width:0">
          <caption class="sr-only">按揭保險計劃最高成數</caption>
          <tr><th style="white-space:normal">樓價</th><th style="white-space:normal">最高成數</th></tr>
          ${mipRows}
        </table>
      </div>
      <p class="dt">90% 只限：所有業主申請時名下冇香港住宅，而且全部申請人都係固定受薪。否則呢幾級通常最高 80%。</p>
    </details>
    <p class="dt">來源：
      <a href="https://www.ird.gov.hk/chi/faq/avd.htm" style="${src}" target="_blank" rel="noopener noreferrer">稅務局從價印花稅</a>
      · <a href="https://www.ird.gov.hk/chi/faq/dsmm.htm" style="${src}" target="_blank" rel="noopener noreferrer">需求管理措施</a>
      · <a href="https://www.hkma.gov.hk/chi/smart-consumers/mortgages/" style="${src}" target="_blank" rel="noopener noreferrer">金管局按揭</a>
      · <a href="https://www.hkmc.com.hk/chi/our_business/mortgage_insurance_programme.html" style="${src}" target="_blank" rel="noopener noreferrer">按揭保險計劃</a>
      · <a href="https://www.hsbc.com.hk/zh-hk/investments/market-information/hk/lending-rate/" style="${src}" target="_blank" rel="noopener noreferrer">滙豐最優惠利率</a>
    </p>
  </div>`;
}

async function renderLegal() {
  if (!(await guard())) return;
  const project = await resolveProjects();
  if (!project) { toast('請先開一個 project', true); location.hash = '#/dashboard'; return; }

  state.legalRecords = await listLegalFinanceRecords(project.id);
  const activeTab = state.legalTab || 'mortgage';
  const records = state.legalRecords.filter(r => r.category === activeTab);
  const tabLabel = (LEGAL_TABS.find(t => t.key === activeTab) || {}).label || '';

  let body = legalReferenceHtml();
  body += `<div class="roomtab">${LEGAL_TABS.map(t => `<button type="button" class="${activeTab === t.key ? 'on' : ''}" data-legaltab="${t.key}" aria-pressed="${activeTab === t.key}">${t.label}</button>`).join('')}</div>`;
  body += records.length ? records.map(r => legalCardHtml(r)).join('') : `<div class="empty">未有${esc(tabLabel)}記錄，撳下面新增。</div>`;

  if (state.legalFormOpen) {
    body += `<div class="card">${legalFormHtml(state.legalRecords.find(r => r.id === state.editingLegalId), activeTab)}</div>`;
  } else {
    body += `<div class="card"><button class="btn gh" id="addLegalBtn">＋ 新增${esc(tabLabel)}記錄</button></div>`;
  }

  appEl.innerHTML = chromeShell('legal', body, projectRowHtml());
  attachChromeEvents();
  attachLegalEvents(project, activeTab);
}

function legalCardHtml(r) {
  const isMortgage = r.category === 'mortgage';
  const headPrice = isMortgage
    ? (r.property_price ? `<span class="price">${money(r.property_price)}</span>` : '')
    : (r.quote_amount ? `<span class="price">${money(r.quote_amount)}</span>` : '');
  const downPaymentAmt = (r.property_price && r.down_payment_pct !== null && r.down_payment_pct !== undefined)
    ? r.property_price * r.down_payment_pct / 100 : null;
  return `<div class="qcard">
    <div class="hd"><b>${esc(r.contact_name) || '未命名'}</b>${headPrice}</div>
    <div class="flagrow"><span class="pill mut">${esc(r.status) || '未設定狀態'}</span></div>
    ${isMortgage ? `<div class="dt">${r.property_price ? `物業總值 ${money(r.property_price)} · ` : ''}${r.down_payment_pct !== null && r.down_payment_pct !== undefined ? `首期 ${r.down_payment_pct}%${downPaymentAmt !== null ? `（${money(downPaymentAmt)}）` : ''} · ` : ''}貸款額 ${r.loan_amount ? money(r.loan_amount) : '—'} · 利率 ${r.interest_rate !== null && r.interest_rate !== undefined ? r.interest_rate + '%' : '—'} · 年期 ${r.loan_years ? r.loan_years + ' 年' : '—'}<br>每月供款 ${r.monthly_payment ? money(r.monthly_payment) : '—'} · 累計已付利息 ${r.total_interest_paid ? money(r.total_interest_paid) : '—'}<br>累計雜費 ${r.total_fee ? money(r.total_fee) : '—'}${r.cash_rebate ? ` · 現金回贈 ${money(r.cash_rebate)}${r.cash_rebate_pct ? `（${r.cash_rebate_pct}%）` : ''}（淨雜費 ${money(Math.max((r.total_fee || 0) - r.cash_rebate, 0))}）` : ''}</div>` : ''}
    ${r.notes ? `<div class="dt">${esc(r.notes)}</div>` : ''}
    <div class="mtop">
      <button class="btn sm gh" data-editlegal="${r.id}">編輯</button>
      <button class="iconbtn" data-dellegal="${r.id}" style="float:right">🗑️</button>
    </div>
  </div>`;
}

function legalFormHtml(editing, category) {
  const r = editing || {};
  const isMortgage = category === 'mortgage';
  const statusOptions = isMortgage ? MORTGAGE_STATUS : LAWYER_STATUS;
  const statusSelect = `<select id="l-status">${statusOptions.map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`;
  return `
    <h3>${editing ? '編輯記錄' : `新增${isMortgage ? '按揭' : '律師'}記錄`}</h3>
    <label class="f" for="l-contact">聯絡人／公司名</label>
    <input type="text" id="l-contact" value="${esc(r.contact_name || '')}" placeholder="${isMortgage ? '例：滙豐銀行' : '例：陳大文律師行'}">
    ${isMortgage ? `
    <label class="f" for="l-status">狀態</label>
    ${statusSelect}
    <div class="grid2">
      <div><label class="f" for="l-price">物業總值／樓價（$）</label><input type="number" id="l-price" value="${r.property_price || ''}" min="0"></div>
      <div><label class="f" for="l-downpct">首期（%）</label><input type="number" id="l-downpct" value="${r.down_payment_pct ?? ''}" min="0" max="100" step="0.1"></div>
    </div>
    <p class="dt" id="l-avd" aria-live="polite"></p>
    <div class="grid2">
      <div><label class="f" for="l-loan">貸款額（$）</label><input type="number" id="l-loan" value="${r.loan_amount || ''}" min="0"></div>
      <div><label class="f" for="l-rate">利率（%）</label><input type="number" id="l-rate" value="${r.interest_rate ?? ''}" min="0" step="0.01"></div>
    </div>
    <label class="f" for="l-years">年期（年）</label>
    <input type="number" id="l-years" value="${r.loan_years || ''}" min="1" max="50">
    <p class="dt">填晒物業總值／首期會自動幫你計貸款額；貸款額、利率、年期填晒又會自動計每月供款同總利息（用固定利率算，僅供參考——銀行實際首兩年利率同之後通常唔同）。金管局對銀行物業按揭嘅年期上限係 ${HK_LEGAL.maxTenorYears} 年（車位 ${HK_LEGAL.carparkTenorYears} 年）；呢度可以填你合約上嘅實際年期。以上欄位你都可以自己覆蓋，覆蓋咗就唔會再自動更新，撳「重新自動計算」可以攞返建議值。</p>
    <div class="grid2">
      <div><label class="f" for="l-monthly">每月供款（$）</label><input type="number" id="l-monthly" value="${r.monthly_payment || ''}" min="0"></div>
      <div><label class="f" for="l-interestpaid">累計已付利息（$）</label><input type="number" id="l-interestpaid" value="${r.total_interest_paid || ''}" min="0"></div>
    </div>
    <div class="grid2">
      <div><label class="f" for="l-rebatepct">現金回贈（%，可選）</label><input type="number" id="l-rebatepct" value="${r.cash_rebate_pct ?? ''}" min="0" step="0.1"></div>
      <div><label class="f" for="l-rebate">現金回贈（$）</label><input type="number" id="l-rebate" value="${r.cash_rebate || ''}" min="0"></div>
    </div>
    <button type="button" class="btn sm gh" id="l-recalc">🔄 重新自動計算</button>
    <label class="f" for="l-fee">累計雜費（$）</label>
    <input type="number" id="l-fee" value="${r.total_fee || ''}" min="0">` : `
    <div class="grid2">
      <div><label class="f" for="l-status">狀態</label>${statusSelect}</div>
      <div><label class="f" for="l-quote">報價（$）</label><input type="number" id="l-quote" value="${r.quote_amount || ''}" min="0"></div>
    </div>`}
    <label class="f" for="l-notes">備註</label>
    <textarea id="l-notes">${esc(r.notes || '')}</textarea>
    <div class="mtop">
      <button class="btn" id="l-save">${editing ? '儲存' : '加入'}</button>
      <button class="btn gh" id="l-cancel" style="margin-left:8px">取消</button>
    </div>`;
}

// Standard amortization formula (fixed rate) — HK mortgages are usually
// multi-tier (低息 first 2-3 years, then a different rate), so this is only
// an estimate, not what the bank will actually charge.
function computeMortgagePayment(loanAmount, annualRatePct, years) {
  // 利率 0% 係合法（只係 monthlyRate === 0 → 平均分期），所以淨係 null／undefined 先當「未填」；
  // 之前 `!annualRatePct` 令 0% 被當成未填，計算靜靜哋放棄、格仔留住上一組舊數字。
  if (!loanAmount || annualRatePct === null || annualRatePct === undefined || !years) return null;
  const monthlyRate = annualRatePct / 100 / 12;
  const n = Math.round(years * 12);
  if (n <= 0) return null;
  const monthly = monthlyRate === 0
    ? loanAmount / n
    : loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n) / (Math.pow(1 + monthlyRate, n) - 1);
  return { monthly: Math.round(monthly), totalInterest: Math.round(monthly * n - loanAmount) };
}

// Auto-fills a chain of dependent fields as the user types:
//   物業總值 + 首期% → 貸款額 → (＋利率/年期) → 每月供款/累計已付利息
//   貸款額 + 回贈%   → 現金回贈（$）
// Each auto-filled field is marked "touched" the moment the user types into
// it directly, and auto-calc stops overwriting that one field from then on —
// until 重新自動計算 resets every touched flag and recomputes the whole chain.
function wireMortgageAutoCalc() {
  const priceEl = document.getElementById('l-price');
  const downPctEl = document.getElementById('l-downpct');
  const loanEl = document.getElementById('l-loan');
  const rateEl = document.getElementById('l-rate');
  const yearsEl = document.getElementById('l-years');
  const monthlyEl = document.getElementById('l-monthly');
  const interestEl = document.getElementById('l-interestpaid');
  const rebatePctEl = document.getElementById('l-rebatepct');
  const rebateEl = document.getElementById('l-rebate');
  const recalcBtn = document.getElementById('l-recalc');
  if (!loanEl || !yearsEl) return; // 律師 form has none of these fields

  let loanTouched = !!loanEl.value;
  let monthlyTouched = !!monthlyEl.value;
  let interestTouched = !!interestEl.value;
  let rebateTouched = !!rebateEl.value;
  loanEl.addEventListener('input', () => { loanTouched = true; });
  monthlyEl.addEventListener('input', () => { monthlyTouched = true; });
  interestEl.addEventListener('input', () => { interestTouched = true; });
  rebateEl.addEventListener('input', () => { rebateTouched = true; });

  // 自動計算出嚟嘅格仔：未改過（或者撳咗「重新自動計算」）先會寫入。算唔到（輸入未齊／有錯）
  // 就清走，而唔係留住上一組舊數字——舊數字同而家輸入對唔上，會誤導用家。
  function setAuto(el, touched, force, value) {
    if (force || !touched) el.value = (value === null || value === undefined) ? '' : value;
  }
  function apply(force) {
    // 先驗證輸入。錯就喺欄位下面顯示原因；空白唔算錯（只係未填）。
    const price = readNumber(priceEl, LIMITS.price);
    const downPct = readNumber(downPctEl, LIMITS.downPct);
    const avdEl = document.getElementById('l-avd');
    if (avdEl) {
      const duty = (price && price.value) ? residentialAvd(price.value) : null;
      avdEl.textContent = duty === null ? '' : `住宅從價印花稅估計 ${money(duty)}（買家印花稅同額外印花稅而家都係 ${HK_LEGAL.bsdPct}%）。稅階見上面參考，只供參考。`;
    }
    const rate = readNumber(rateEl, LIMITS.ratePct);
    const years = readNumber(yearsEl, LIMITS.years);
    const rebatePct = readNumber(rebatePctEl, LIMITS.rebatePct);

    // 1. 物業總值 + 首期% → 貸款額（兩樣都填咗而且冇錯先計）
    const canLoan = price && downPct && price.value !== null && downPct.value !== null;
    setAuto(loanEl, loanTouched, force, canLoan ? Math.round(price.value * (1 - downPct.value / 100)) : null);
    const loan = readNumber(loanEl, LIMITS.loan);
    if (loan && loan.value && price && price.value && loan.value > price.value) {
      setFieldError(loanEl, '貸款額唔可以大過樓價');
    }
    const loanV = loan && loan.value ? loan.value : 0;

    // 2. 貸款額 + 利率 + 年期 → 每月供款／累計已付利息（interest derived from
    //    whatever monthly is actually showing, so the pair never mismatches）
    const canPay = loanV > 0 && rate && rate.value !== null && years && years.value !== null;
    const result = canPay ? computeMortgagePayment(loanV, rate.value, years.value) : null;
    setAuto(monthlyEl, monthlyTouched, force, result ? result.monthly : null);
    if (result) {
      const n = Math.round(years.value * 12);
      const effectiveMonthly = +monthlyEl.value || result.monthly;
      // 利率 0% 一定係 $0 利息；唔好用「四捨五入咗嘅月供 × 期數 − 本金」計，會有幾蚊誤差
      setAuto(interestEl, interestTouched, force, rate.value === 0 ? 0 : (n > 0 ? Math.round(effectiveMonthly * n - loanV) : result.totalInterest));
    } else {
      setAuto(interestEl, interestTouched, force, null);
    }

    // 3. 貸款額 + 回贈% → 現金回贈（$）
    const canRebate = loanV > 0 && rebatePct && rebatePct.value !== null;
    setAuto(rebateEl, rebateTouched, force, canRebate ? Math.round(loanV * rebatePct.value / 100) : null);
  }
  [priceEl, downPctEl, loanEl, rateEl, yearsEl, rebatePctEl].forEach(el => el.addEventListener('input', () => apply(false)));
  if (recalcBtn) recalcBtn.addEventListener('click', () => {
    loanTouched = monthlyTouched = interestTouched = rebateTouched = false;
    apply(true);
  });
}

function attachLegalEvents(project, activeTab) {
  appEl.querySelectorAll('input[type=number]').forEach(el => el.addEventListener('input', () => clearFieldError(el)));
  appEl.querySelectorAll('[data-legaltab]').forEach(el => el.addEventListener('click', () => {
    state.legalTab = el.dataset.legaltab; state.legalFormOpen = false; state.editingLegalId = null; renderLegal();
  }));
  if (state.legalFormOpen && activeTab === 'mortgage') wireMortgageAutoCalc();
  const addBtn = document.getElementById('addLegalBtn');
  if (addBtn) addBtn.addEventListener('click', () => { state.legalFormOpen = true; state.editingLegalId = null; renderLegal(); });
  const cancelBtn = document.getElementById('l-cancel');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { state.legalFormOpen = false; state.editingLegalId = null; renderLegal(); });
  appEl.querySelectorAll('[data-editlegal]').forEach(el => el.addEventListener('click', () => {
    state.legalFormOpen = true; state.editingLegalId = el.dataset.editlegal; renderLegal();
  }));
  appEl.querySelectorAll('[data-dellegal]').forEach(el => el.addEventListener('click', async () => {
    if (!confirm('刪除呢條記錄？')) return;
    const id = el.dataset.dellegal;
    const backup = state.legalRecords.slice();
    state.legalRecords = state.legalRecords.filter(r => r.id !== id);
    renderLegal();
    try { await deleteLegalFinanceRecord(id); toast('已刪除'); }
    catch (e) { state.legalRecords = backup; toast(e.message, true); renderLegal(); }
  }));
  const saveBtn = document.getElementById('l-save');
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    // 儲存前逐個欄位驗證；有錯就喺欄位下面顯示原因、focus 第一個錯嘅欄位，唔儲存。
    // 0 對呢三個欄位係有意義嘅數值（0% 首期／利率／回贈），其餘金額 0 當未填（null）。
    const zeroOk = new Set(['down_payment_pct', 'interest_rate', 'cash_rebate_pct']);
    const fields = {
      category: activeTab,
      contact_name: document.getElementById('l-contact').value.trim() || null,
      status: document.getElementById('l-status').value,
      notes: document.getElementById('l-notes').value.trim() || null,
    };
    const specs = activeTab === 'mortgage' ? [
      ['l-price', LIMITS.price, 'property_price'],
      ['l-downpct', LIMITS.downPct, 'down_payment_pct'],
      ['l-loan', LIMITS.loan, 'loan_amount'],
      ['l-rate', LIMITS.ratePct, 'interest_rate'],
      ['l-years', LIMITS.years, 'loan_years'],
      ['l-monthly', { ...LIMITS.money, label: '每月供款' }, 'monthly_payment'],
      ['l-interestpaid', { ...LIMITS.money, label: '累計已付利息' }, 'total_interest_paid'],
      ['l-rebatepct', LIMITS.rebatePct, 'cash_rebate_pct'],
      ['l-rebate', { ...LIMITS.money, label: '現金回贈' }, 'cash_rebate'],
      ['l-fee', { ...LIMITS.money, label: '手續費總額' }, 'total_fee'],
    ] : [
      ['l-quote', { ...LIMITS.money, label: '報價' }, 'quote_amount'],
    ];
    let firstBad = null;
    specs.forEach(([id, lim, key]) => {
      const el = document.getElementById(id);
      const r = readNumber(el, lim);
      if (!r) { if (!firstBad) firstBad = el; return; }
      fields[key] = (r.value === null || (r.value === 0 && !zeroOk.has(key))) ? null : r.value;
    });
    if (activeTab === 'mortgage' && fields.loan_amount && fields.property_price && fields.loan_amount > fields.property_price) {
      const loanEl = document.getElementById('l-loan');
      setFieldError(loanEl, '貸款額唔可以大過樓價');
      if (!firstBad) firstBad = loanEl;
    }
    if (firstBad) { firstBad.focus(); return; }
    try {
      saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spin"></span>';
      if (state.editingLegalId) await updateLegalFinanceRecord(state.editingLegalId, fields);
      else await createLegalFinanceRecord(state.user.id, project.id, fields);
      toast('已儲存');
      state.legalFormOpen = false; state.editingLegalId = null;
      renderLegal();
    } catch (e) {
      toast(e.message, true);
      saveBtn.disabled = false; saveBtn.textContent = state.editingLegalId ? '儲存' : '加入';
    }
  });
}
