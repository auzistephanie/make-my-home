// #/legal — 律師／按揭記錄（Task 2）。由 app.html 搬出嚟（2026-10-11，拆細 app.html 第二個 module）。
// 普通 <script>（唔係 ES module），共用全域，同 spending.js／db.js 一樣。依賴 app.html 內嘅
// state／appEl／guard／resolveProjects／chromeShell／projectRowHtml／attachChromeEvents／money／esc／toast，
// 同 db.js 嘅 listLegalFinanceRecords／createLegalFinanceRecord／updateLegalFinanceRecord／deleteLegalFinanceRecord。
// 全部喺 route 觸發 render 時先叫用，所以 <script> 載入次序唔影響。

const LAWYER_STATUS = ['已聯絡', '報價中', '已落實', '完成'];
const MORTGAGE_STATUS = ['申請中', '已批核', '已落實', '完成'];
const LEGAL_TABS = [
  { key: 'lawyer', label: '律師' },
  { key: 'mortgage', label: '按揭' },
];

async function renderLegal() {
  if (!(await guard())) return;
  const project = await resolveProjects();
  if (!project) { toast('請先開一個 project', true); location.hash = '#/dashboard'; return; }

  state.legalRecords = await listLegalFinanceRecords(project.id);
  const activeTab = state.legalTab || 'lawyer';
  const records = state.legalRecords.filter(r => r.category === activeTab);
  const tabLabel = (LEGAL_TABS.find(t => t.key === activeTab) || {}).label || '';

  let body = `<div class="roomtab">${LEGAL_TABS.map(t => `<button type="button" class="${activeTab === t.key ? 'on' : ''}" data-legaltab="${t.key}" aria-pressed="${activeTab === t.key}">${t.label}</button>`).join('')}</div>`;
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
    <div class="grid2">
      <div><label class="f" for="l-loan">貸款額（$）</label><input type="number" id="l-loan" value="${r.loan_amount || ''}" min="0"></div>
      <div><label class="f" for="l-rate">利率（%）</label><input type="number" id="l-rate" value="${r.interest_rate ?? ''}" min="0" step="0.01"></div>
    </div>
    <label class="f" for="l-years">年期（年）</label>
    <input type="number" id="l-years" value="${r.loan_years || ''}" min="1" max="50">
    <p class="dt">填晒物業總值／首期會自動幫你計貸款額；貸款額、利率、年期填晒又會自動計每月供款同總利息（用固定利率算，僅供參考——銀行實際首兩年利率同之後通常唔同）。以上欄位你都可以自己覆蓋，覆蓋咗就唔會再自動更新，撳「重新自動計算」可以攞返建議值。</p>
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
