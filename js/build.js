// #/build — 七個工序卡（開工／完成／驗收日期、驗收 checklist、備註、相片）。由 app.html 搬出嚟（2026-10-11，拆細 app.html 第三個 module）。
// 普通 <script>（唔係 ES module），共用全域，同 spending.js／legal.js／db.js 一樣。依賴 app.html 內嘅
// state／appEl／guard／resolveProjects／chromeShell／projectRowHtml／attachChromeEvents／handoffStatus／esc／toast／dispDate，
// content.js 嘅 STAGES／INSPECT／STAGE_INSPECT_MAP，同 db.js／photos.js 嘅 ensureStages／listQuotes／listPhotos／
// photoPublicPath／updateStage／deletePhoto／uploadPhotos。全部喺 route 觸發 render 時先叫用，所以 <script> 載入次序唔影響。
// 注意：handoffStatus 同報價頁共用，留喺 app.html（拆報價頁嗰陣再一齊處理）。

async function renderBuild() {
  if (!(await guard())) return;
  const project = await resolveProjects();
  if (!project) { toast('請先開一個 project', true); location.hash = '#/dashboard'; return; }

  const [stages, quotes] = await Promise.all([
    ensureStages(state.user.id, project.id),
    listQuotes(project.id),
  ]);
  state.stages = stages;
  state.quotes = quotes;
  await Promise.all(state.stages.map(async s => {
    if (!state.photosByStage[s.id]) {
      const rows = await listPhotos(s.id);
      await Promise.all(rows.map(async r => { const { data } = await photoPublicPath(r.path); r.url = data ? data.signedUrl : ''; }));
      state.photosByStage[s.id] = rows;
    }
  }));

  const contract = state.quotes.find(q => q.status === 'signed' && q.flags && q.flags._kind === 'contract');
  const otherQuotes = state.quotes.filter(q => q !== contract);
  const handoff = handoffStatus(contract, otherQuotes);
  const responsibilityByStage = Object.fromEntries(handoff.plan.map(item => [item.stageKey, item]));
  const awaitingInspection = state.stages.find(s => s.finished_on && !s.inspected_on);
  const inProgress = state.stages.find(s => s.started_on && !s.finished_on);
  const nextStage = state.stages.find(s => !s.started_on);
  const focusStage = awaitingInspection || inProgress || nextStage;
  const focusDef = focusStage && STAGES.find(s => s.k === focusStage.key);
  const focusAction = awaitingInspection ? '完成驗收' : (inProgress ? '跟進施工及記錄完成日' : '記錄實際開工日');
  const focusGuide = focusStage ? `<div class="buildfocus"><div><div class="eyebrow">今日先做呢一步</div><h2>${esc(focusDef.n)}</h2><p>${focusAction}。其餘工序資料會繼續保留，之後再處理。</p></div><button class="btn mustard" data-focus-stage="${focusStage.id}">去到呢一步 ↓</button></div>` : '<div class="note good">🎉 七個工序已全部完成及驗收。</div>';
  const dateGuide = `<div class="builddates"><b>日期點填？</b><span><strong>預計開工日</strong>：${project.start_date ? dispDate(project.start_date) : '未設定'}（整體計劃）</span><span><strong>工序開工日</strong>：實際開始呢個工序</span><span><strong>完成日</strong>：施工完成　·　<strong>驗收日</strong>：檢查合格</span></div>`;
  const handoffBanner = contract ? `<div class="buildhandoff ${handoff.confirmed && !handoff.unresolved.length ? 'confirmed' : ''}"><div><div class="eyebrow">開工前責任交接</div><b>${handoff.confirmed && !handoff.unresolved.length ? '七個工序責任已確認' : `${handoff.unresolved.length} 個工序責任未落實`}</b><p>${handoff.confirmed && !handoff.unresolved.length ? '每張工序卡都會顯示負責公司同合約來源。' : '你仍可預覽施工頁；正式開工前請先完成責任交接。'}</p></div><button class="btn sm ${handoff.confirmed ? 'gh' : ''}" data-nav="#/quotes">${handoff.confirmed ? '查看責任清單' : '處理責任 →'}</button></div>` : '<div class="note warn">未加入已簽主合約；施工記錄可以使用，但暫時未有責任來源。</div>';
  const body = handoffBanner + focusGuide + dateGuide + state.stages.map((s, i) => stageCardHtml(s, i, responsibilityByStage[s.key], focusStage && s.id === focusStage.id)).join('');
  appEl.innerHTML = chromeShell('build', body, projectRowHtml());
  attachChromeEvents();
  attachBuildEvents(project);
}

function stageCardHtml(stage, idx, responsibility, focused) {
  const def = STAGES.find(s => s.k === stage.key);
  const cls = stage.finished_on && stage.inspected_on ? 'done' : (stage.started_on || focused ? 'now' : '');
  const pill = stage.finished_on && !stage.inspected_on ? '<span class="pill o">待驗收</span>' : (stage.finished_on ? '<span class="pill g">完成及驗收 ✓</span>' : (stage.started_on ? '<span class="pill o">進行中</span>' : '<span class="pill mut">未開始</span>'));
  const inspectIdx = STAGE_INSPECT_MAP[stage.key];
  const checklist = inspectIdx !== undefined ? INSPECT[inspectIdx] : null;
  let checklistHtml = '';
  if (checklist) {
    const items = checklist.items;
    const checked = stage.checklist || {};
    const doneCount = items.filter((_, i) => checked[i]).length;
    checklistHtml = `
      <details class="acc-native" style="margin-top:8px">
        <summary style="cursor:pointer;font-size:.82rem;color:var(--green);font-weight:700">驗收 checklist（${doneCount}/${items.length}）${checklist.tag ? ' · ' + checklist.tag : ''}</summary>
        <ul class="chk">
          ${items.map((it, i) => `<li><input type="checkbox" id="chk-${stage.id}-${i}" data-check="${stage.id}:${i}" ${checked[i] ? 'checked' : ''}><label for="chk-${stage.id}-${i}"><b>${esc(it[0])}</b><small>${esc(it[1])}</small></label></li>`).join('')}
        </ul>
      </details>`;
  }
  const photos = state.photosByStage[stage.id] || [];
  const photosHtml = `
    <div class="photos">
      ${photos.map(p => `<div class="ph"><img src="${p.url}" alt=""><button class="rm" data-delphoto="${stage.id}:${p.id}:${esc(p.path)}" aria-label="刪除相片">×</button></div>`).join('')}
      <div class="ph add" data-addphoto="${stage.id}" role="button" tabindex="0" aria-label="新增相片">＋</div>
    </div>
    <input type="file" accept="image/*" multiple data-fileinput="${stage.id}" aria-label="選擇相片" style="display:none">
    ${photos.length >= 2 ? `<button type="button" class="btn sm gh" data-cmp="${stage.id}" aria-expanded="false">⇆ 前後對比</button><div data-cmpbox="${stage.id}"></div>` : ''}`;
  return `
    <div class="stgcard ${cls} ${focused ? 'focused' : ''}" id="stage-${stage.id}">
      <div class="t"><b>${idx + 1}. ${def.n}</b>${pill}</div>
      ${responsibility ? `<div class="stageresponsibility ${responsibility.ready ? 'ready' : ''}"><span>負責公司</span><b>${responsibility.company ? esc(responsibility.company) : '未落實'}</b><small>${responsibility.source ? `${responsibility.source} · ${esc(responsibility.label)}` : (responsibility.status === 'check' ? '要先向主承辦商問清楚' : '未揀定額外報價')}</small><a href="#/quotes">查看責任來源 →</a></div>` : ''}
      <div class="grid2 mtop">
        <div><label class="f" for="df-${stage.id}-started_on">開工日期</label><input type="date" id="df-${stage.id}-started_on" data-datefield="${stage.id}:started_on" value="${stage.started_on || ''}"></div>
        <div><label class="f" for="df-${stage.id}-finished_on">完成日期</label><input type="date" id="df-${stage.id}-finished_on" data-datefield="${stage.id}:finished_on" value="${stage.finished_on || ''}"></div>
        <div><label class="f" for="df-${stage.id}-inspected_on">驗收日期</label><input type="date" id="df-${stage.id}-inspected_on" data-datefield="${stage.id}:inspected_on" value="${stage.inspected_on || ''}"></div>
      </div>
      ${checklistHtml}
      ${photosHtml}
      <label class="f" for="note-${stage.id}">備註</label>
      <textarea id="note-${stage.id}" data-notefield="${stage.id}" placeholder="例：主人房加咗一個 LAN 位">${esc(stage.note || '')}</textarea>
    </div>`;
}

function attachBuildEvents(project) {
  appEl.querySelectorAll('[data-cmp]').forEach(btn => btn.addEventListener('click', () => {
    const box = appEl.querySelector(`[data-cmpbox="${btn.dataset.cmp}"]`);
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    box.innerHTML = open ? '' : stageCompareHtml(state.photosByStage[btn.dataset.cmp] || []);
    if (!open) bindStageCompare(box);
  }));
  appEl.querySelectorAll('[data-focus-stage]').forEach(el => el.addEventListener('click', () => {
    document.getElementById(`stage-${el.dataset.focusStage}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  appEl.querySelectorAll('[data-datefield]').forEach(el => el.addEventListener('change', async () => {
    const [stageId, field] = el.dataset.datefield.split(':');
    const stage = state.stages.find(s => s.id === stageId);
    const prev = stage[field];
    const value = el.value || null;
    const dates = { started_on: stage.started_on, finished_on: stage.finished_on, inspected_on: stage.inspected_on, [field]: value };
    if (dates.finished_on && !dates.started_on) { toast('請先填工序開工日期', true); el.value = prev || ''; return; }
    if (dates.inspected_on && !dates.finished_on) { toast('請先填完成日期', true); el.value = prev || ''; return; }
    if (dates.started_on && dates.finished_on && dates.finished_on < dates.started_on) { toast('完成日期不可早過開工日期', true); el.value = prev || ''; return; }
    if (dates.finished_on && dates.inspected_on && dates.inspected_on < dates.finished_on) { toast('驗收日期不可早過完成日期', true); el.value = prev || ''; return; }
    stage[field] = value;
    // re-render for pill/border update, but keep focus not critical (date input)
    try {
      await updateStage(stageId, { [field]: stage[field] });
      toast('已儲存');
      renderBuild();
      // 防水（泥水）工序驗收日期剛剛填好 → 拆咗漏水伏
      if (field === 'inspected_on' && value && !prev && stage.key === 'wet' && stage.finished_on) celebrateFu('leak', '泥水防水已驗收（48 小時試水要合格先算數）。');
      else if (field === 'inspected_on' && value && !prev && stage.finished_on) celebrateStage(stage.key);
    } catch (e) { stage[field] = prev; toast(e.message, true); renderBuild(); }
  }));

  appEl.querySelectorAll('[data-check]').forEach(el => el.addEventListener('change', async () => {
    const [stageId, itemIdx] = el.dataset.check.split(':');
    const stage = state.stages.find(s => s.id === stageId);
    const checklist = Object.assign({}, stage.checklist || {});
    const prev = Object.assign({}, checklist);
    checklist[itemIdx] = el.checked;
    stage.checklist = checklist;
    try { await updateStage(stageId, { checklist }); }
    catch (e) { stage.checklist = prev; el.checked = !el.checked; toast(e.message, true); }
  }));

  const noteTimers = {};
  appEl.querySelectorAll('[data-notefield]').forEach(el => el.addEventListener('input', () => {
    const stageId = el.dataset.notefield;
    clearTimeout(noteTimers[stageId]);
    noteTimers[stageId] = setTimeout(async () => {
      const stage = state.stages.find(s => s.id === stageId);
      const prev = stage.note;
      stage.note = el.value;
      try { await updateStage(stageId, { note: el.value }); toast('備註已自動儲存'); }
      catch (e) { stage.note = prev; toast(e.message, true); }
    }, 800);
  }));

  appEl.querySelectorAll('[data-addphoto]').forEach(el => el.addEventListener('click', () => {
    const stageId = el.dataset.addphoto;
    const input = appEl.querySelector(`[data-fileinput="${stageId}"]`);
    input.click();
  }));
  appEl.querySelectorAll('[data-addphoto]').forEach(el => el.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.click(); }
  }));
  appEl.querySelectorAll('[data-fileinput]').forEach(el => el.addEventListener('change', async () => {
    const stageId = el.dataset.fileinput;
    if (!el.files || !el.files.length) return;
    toast('上載緊相片…');
    try {
      const rows = await uploadPhotos(state.user.id, project.id, stageId, el.files);
      state.photosByStage[stageId] = (state.photosByStage[stageId] || []).concat(rows);
      toast(`已上載 ${rows.length} 張相`);
      renderBuild();
    } catch (e) { toast('上載失敗：' + e.message, true); }
  }));
  appEl.querySelectorAll('[data-delphoto]').forEach(el => el.addEventListener('click', async () => {
    const [stageId, photoId, path] = el.dataset.delphoto.split(':');
    if (!confirm('刪除呢張相？')) return;
    const backup = state.photosByStage[stageId];
    state.photosByStage[stageId] = backup.filter(p => p.id !== photoId);
    renderBuild();
    try { await deletePhoto(photoId, path); toast('已刪除'); }
    catch (e) { state.photosByStage[stageId] = backup; toast(e.message, true); renderBuild(); }
  }));
}
