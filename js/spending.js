// #/spending — 總支出總覽。由 app.html 搬出嚟（2026-10-11，拆細 app.html 嘅第一個試驗 module）。
// 普通 <script>（唔係 ES module）：同 db.js／photos.js 一樣共用全域——依賴 app.html 內嘅
// guard／resolveProjects／chromeShell／projectRowHtml／attachChromeEvents／committedExtraQuotes／
// quoteLineItems／money／esc／toast／appEl，同 db.js 嘅 listQuotes／listLegalFinanceRecords。
// 全部喺 route 觸發 render 時先被叫用，所以 <script> 載入次序唔影響。

// ================================================================
// #/spending — 總支出總覽（Task 3b）
//
// Step 3a audit（見 CHANGELOG）發現現有 schema 冇任何欄位系統性咁分「已付」
// 同「待付」——quotes.total／legal_finance.quote_amount 都只係金額＋一個文字
// status。跟 Stephanie 確認咗做法：唔改 schema、唔勉強分已付/待付，淨係加總
// 「已落實」嘅金額（signed 合約／已選定額外工程／status 係已落實或完成嘅法律
// 財務記錄），未落實嘅候選報價唔計入。
// ================================================================
const SPENDING_COMMITTED_STATUS = ['已落實', '完成'];

async function renderSpending() {
  if (!(await guard())) return;
  const project = await resolveProjects();
  if (!project) { toast('請先開一個 project', true); location.hash = '#/dashboard'; return; }

  const [quotes, legalRecords] = await Promise.all([
    listQuotes(project.id),
    listLegalFinanceRecords(project.id),
  ]);

  const contract = quotes.find(q => q.status === 'signed' && q.flags && q.flags._kind === 'contract');
  const otherQuotes = quotes.filter(q => q !== contract);
  let renoCommitted, renoNote, extraQuotes = [], extraTotal = 0;
  if (contract) {
    extraQuotes = committedExtraQuotes(contract, otherQuotes);
    extraTotal = extraQuotes.reduce((sum, q) => sum + (+q.total || 0), 0);
    renoCommitted = +contract.total || 0;
    renoNote = '已簽主合約';
  } else {
    const signedQuotes = quotes.filter(q => q.status === 'signed');
    renoCommitted = signedQuotes.reduce((sum, q) => sum + (+q.total || 0), 0);
    renoNote = signedQuotes.length ? '已標記「已簽約」嘅報價' : '未有已簽約報價';
  }

  const lawyerRecords = legalRecords.filter(r => r.category === 'lawyer' && SPENDING_COMMITTED_STATUS.includes(r.status));
  const mortgageRecords = legalRecords.filter(r => r.category === 'mortgage' && SPENDING_COMMITTED_STATUS.includes(r.status));
  const lawyerCommitted = lawyerRecords.reduce((sum, r) => sum + (+r.quote_amount || 0), 0);
  // 貸款額本身唔係裝修支出（係借返嚟嘅錢），呢度加嘅係按揭雜費扣咗現金回贈之後嘅淨支出。
  const mortgageCommitted = mortgageRecords.reduce((sum, r) => sum + Math.max((+r.total_fee || 0) - (+r.cash_rebate || 0), 0), 0);

  const rows = [
    { label: '裝修工程', note: renoNote, amount: renoCommitted },
    { label: '額外工程', note: `${extraQuotes.length} 項已簽約／已選定`, amount: extraTotal },
    { label: '律師', note: `${lawyerRecords.length} 項已落實／完成`, amount: lawyerCommitted },
    { label: '按揭手續', note: `${mortgageRecords.length} 項已落實／完成 · 淨雜費（已扣現金回贈）`, amount: mortgageCommitted },
  ];
  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);

  const body = `
    <div class="hero-num"><div class="n">${money(grandTotal)}</div><div class="l">已落實總支出承諾</div></div>
    <div class="note">呢個數只計「已落實」嘅金額——已簽合約、已簽約或已選定嘅額外工程報價，同埋法律財務入面狀態係「已落實」或「完成」嘅記錄。報價中／未落實嘅候選金額唔會計入；想睇返逐項，去「揀公司」或「法律財務」對照。</div>
    ${contract ? extraWorksAlertHtml(extraWorksAlert(contract.total, extraTotal), money) : ''}
    <div class="card">
      <h3>按 module 分項</h3>
      ${rows.map(r => `<div class="deadlinerow"><b>${money(r.amount)}</b><span>${esc(r.label)} · ${esc(r.note)}</span></div>`).join('')}
    </div>
    ${extraQuotes.length ? `<div class="card"><h3>額外工程明細</h3>${extraQuotes.map(q => {
      const items = quoteLineItems(q);
      return `<div class="xgroup"><div class="xhead"><span>${esc(q.company)}</span><b>${money(q.total)}</b></div>${items ? items.map(it => `<div class="xitem"><span>${esc(it.name)}</span><span>${money(it.amount)}</span></div>`).join('') : '<div class="xitem muted">未有明細，只有總價</div>'}</div>`;
    }).join('')}</div>` : ''}`;
  appEl.innerHTML = chromeShell('spending', body, projectRowHtml());
  attachChromeEvents();
}
