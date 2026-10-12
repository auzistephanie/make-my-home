// 首頁互動開場（2026-10-13）— 配合 css/landing-fun.css。
// A 拆伏之路：捲動帶公仔沿街行，4 隻通用伏（對應伏位警示 #1 #3 #4 #8）彈出嚟撳佢拆；
// C 你住邊種屋：揀屋 → 鏡頭衝入去 → 搵晒 3 隻專屬伏 → 解鎖裝修前後拖拉對比；
// Q 3 條問題測你係邊種裝修新手，結果指去最啱嘅工具。
// 效能：A 只喺捲動時用一個 rAF 更新 transform；冇 3D 圖層。
(function(){
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IMG = 'img/landing/';

  // 4 隻通用伏 — 字眼同下面「伏位警示廊」對應條目一致（trap 號碼）
  const FU = {
    price: { img: 'fu_price', name: '加價單伏', trap: 1, tip: '低價吸你簽約，拆咗牆先話要加錢。三間報價對照，合約寫明加減工程點計。' },
    ghost: { img: 'fu_ghost', name: '走佬師傅伏', trap: 3, tip: '收咗大額訂金就拖工甩底。首期唔超過 20%，分最少 4 期，驗收合格先過數。' },
    leak:  { img: 'fu_leak',  name: '漏水伏',   trap: 4, tip: '防水入牆睇唔到最易偷工。泥水後一定要 48 小時浸水試驗，落層天花冇印先算合格。' },
    delay: { img: 'fu_delay', name: '甩期伏',   trap: 8, tip: '兩個月變四個月，你租緊屋雙重開支。合約寫明完工日期＋每日延誤賠償額。' }
  };
  const busted = new Set();
  const nav = document.getElementById('fun-nav');

  /* ======================= A 拆伏之路 ======================= */
  (function(){
    const root = document.getElementById('fun-a');
    if (!root) return;
    const world = root.querySelector('.world'), hills = root.querySelector('.hills'), stick = root.querySelector('.stick'), runway = root.querySelector('.runway');
    const W = 4900;
    const items = [
      ['lamp', 680], ['bld', 'tonglau', 920, .62], ['fu', 'price', 1160], ['lamp', 1420],
      ['bld', 'villagehouse', 1720, .5], ['fu', 'ghost', 2000], ['lamp', 2250],
      ['bld', 'estate', 2600, .78], ['fu', 'leak', 2900], ['lamp', 3150],
      ['bld', 'tonglau', 3500, .6], ['fu', 'delay', 3780], ['lamp', 4100], ['bld', 'villagehouse', 4550, .5]
    ];
    const fus = [];
    items.forEach(it => {
      if (it[0] === 'lamp') {
        const d = document.createElement('div'); d.className = 'lamp'; d.style.left = it[1] + 'px'; world.appendChild(d);
      } else if (it[0] === 'bld') {
        const d = document.createElement('div'); d.className = 'bld'; d.style.left = it[2] + 'px'; d.style.height = (it[3] * 100) + 'vh';
        d.innerHTML = `<img src="${IMG}${it[1]}.webp" alt="" loading="lazy">`; world.appendChild(d);
      } else {
        const f = FU[it[1]], b = document.createElement('button');
        b.type = 'button'; b.className = 'fu'; b.style.left = it[2] + 'px'; b.setAttribute('aria-label', '拆走' + f.name);
        b.innerHTML = `<span class="q" aria-hidden="true">撳我拆！</span><img src="${IMG}${f.img}.webp" alt="">`;
        world.appendChild(b);
        const o = { el: b, x: it[2], k: it[1], done: false }; fus.push(o);
        b.addEventListener('click', () => {
          if (o.done) return;
          o.done = true; busted.add(o.k); b.classList.add('gone'); b.disabled = true;
          boom(b); score(); tip(f); markTraps(); render(true);
        });
      }
    });
    const slots = [...root.querySelectorAll('.hud .slots i')], tipEl = root.querySelector('.tip'), bubble = root.querySelector('.bubble'),
          title = root.querySelector('.title'), hint = root.querySelector('.scrollhint'), mascot = root.querySelector('.mascot'),
          end = root.querySelector('.endcard'), hud = root.querySelector('.hud'), skip = root.querySelector('.skip');
    let tipT;
    function tip(f){
      tipEl.querySelector('b').textContent = '✓ 拆咗「' + f.name + '」';
      tipEl.querySelector('span').textContent = f.tip;
      tipEl.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(() => tipEl.classList.remove('show'), 4500);
    }
    function boom(b){
      const r = b.getBoundingClientRect(), s = stick.getBoundingClientRect(), d = document.createElement('div');
      d.className = 'boom'; d.textContent = '拆！'; d.style.left = (r.left - s.left + r.width / 2) + 'px'; d.style.top = (r.top - s.top + r.height / 2) + 'px';
      stick.appendChild(d); setTimeout(() => d.remove(), 900);
    }
    function score(){
      const n = busted.size;
      slots.forEach((s, i) => { s.classList.toggle('done', i < n); s.textContent = i < n ? '✓' : i + 1; });
      hud.setAttribute('aria-label', '已拆伏 ' + n + '／4');
    }
    let walkT, lastP = -1, lastState = '';
    function render(force){
      const r = runway.getBoundingClientRect(), vh = innerHeight, vw = innerWidth;
      const p = Math.min(1, Math.max(0, -r.top / (r.height - vh)));
      if (nav) nav.classList.toggle('past', r.bottom < vh * 0.35);
      if (!force && p === lastP) return;
      const x = -p * (W - vw);
      world.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      hills.style.transform = `translate3d(${(x * .25).toFixed(1)}px,0,0)`;
      fus.forEach(f => { const sx = f.x + x; f.el.classList.toggle('up', !f.done && sx < vw * .95 && sx > vw * .3); });
      const n = busted.size;
      title.style.opacity = Math.max(0, 1 - p * 12);
      hud.style.opacity = p > .06 ? 1 : 0;           // 標題淡出之後先出計分，唔好疊埋
      hint.style.opacity = p < .02 ? 1 : 0;
      skip.classList.toggle('off', p < .06 || p > .95);
      const atEnd = p > .97;
      bubble.style.opacity = (p < .04 || atEnd) ? 1 : 0;
      const state = (atEnd ? 'e' : 's') + n;
      if (state !== lastState) {
        lastState = state;
        bubble.textContent = atEnd ? (n === 4 ? '全部拆晒！我唔驚啦 💪' : '仲有 ' + (4 - n) + ' 隻伏未拆…返轉頭搵下？') : '第一次裝修…好驚中伏 😰 捲落去陪我行！';
        end.querySelector('h2').textContent = n === 4 ? '4 隻伏全部拆晒 🎉' : '拆咗 ' + n + '／4 隻伏';
        end.querySelector('p').textContent = n === 4 ? '真裝修仲有好多伏。用「裝修無伏」逐步規劃、比較報價、分段驗收。' : '漏咗嘅伏，真裝修會搵返你。等我哋幫你逐個避開。';
      }
      end.classList.toggle('show', p > .985);
      if (!RM && Math.abs(p - lastP) > .0005) { mascot.classList.add('walk'); clearTimeout(walkT); walkT = setTimeout(() => mascot.classList.remove('walk'), 160); }
      lastP = p;
    }
    let raf = 0;
    const kick = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };
    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', () => render(true));
    render(true);
  })();

  /* ======================= 伏位警示：標記街度拆過嘅 ======================= */
  function markTraps(){
    const traps = document.querySelectorAll('#traps .trap');
    Object.values(FU).forEach(f => {
      const t = traps[f.trap - 1]; if (!t) return;
      const b = t.querySelector('b'); if (!b) return;
      let chip = t.querySelector('.trap-chip');
      if (!chip) {
        chip = document.createElement('span'); chip.className = 'trap-chip'; b.appendChild(chip);
        const im = document.createElement('img'); im.className = 'fu-mini'; im.src = IMG + f.img + '.webp'; im.alt = ''; im.loading = 'lazy';
        b.parentElement.insertBefore(im, b);
      }
      const done = busted.has(Object.keys(FU).find(k => FU[k] === f));
      chip.classList.toggle('done', done);
      chip.textContent = done ? '✓ 你喺街度拆咗' : '街度見過';
    });
  }
  markTraps();

  /* ======================= C 你住邊種屋 ======================= */
  (function(){
    const root = document.getElementById('fun-c');
    if (!root) return;
    const zoom = root.querySelector('.zoomer'), room = root.querySelector('.room'), pic = root.querySelector('.pic'),
          tipEl = root.querySelector('.tipC'), title = root.querySelector('.room h3'), hint = root.querySelector('.hint2'),
          range = pic.querySelector('input'), back = root.querySelector('.back');
    // 每種屋 3 隻「專屬伏」— 刻意唔重複上面 A 嘅 4 隻同伏位警示 8 條
    const DATA = {
      tonglau: { name: '唐樓', spots: [
        ['leak', 62, 14, '樓上滲水伏', '舊唐樓天花水漬好多時係樓上滲落嚟。開工前先同樓上／法團傾，搵到源頭先執，唔好油過就算。'],
        ['price', 30, 72, '搬運費伏', '冇電梯、要人手搬料上樓，好多師傅開工後先講「搬運費」。報價一定要寫埋搬運同垃圾清運。'],
        ['delay', 82, 66, '電線老化伏', '舊樓電線容量唔夠，好易「開咗先發現要換總掣」。報價前叫師傅睇埋電錶房，寫明換線範圍。'] ] },
      villagehouse: { name: '村屋', spots: [
        ['leak', 50, 12, '天台滲水伏', '村屋天台同外牆日曬雨淋最易滲水。雨季前做好天台防水，完工要試水先收貨。'],
        ['delay', 22, 64, '雨季停工伏', '村屋多數露天開工，雨季、颱風會停工。合約寫清楚天氣延誤點計，唔好畀人一句「落雨」就拖成個月。'],
        ['price', 78, 70, '入料運輸伏', '車去唔到門口就要人手推車運料，費用隨時另計。睇位時問清楚貨車停邊、點運，寫入報價。'] ] },
      estate: { name: '屋苑', spots: [
        ['ghost', 40, 68, '管理處按金伏', '屋苑有裝修守則：開工時間、按金、搬運升降機要預約。師傅唔跟守則，扣嘅係你嘅按金。'],
        ['delay', 75, 40, '公用部分伏', '窗、冷氣機位、外牆屬公用部分，郁之前要向管理處申請。審批時間要計入工期。'],
        ['price', 58, 16, '噪音時段伏', '大部分屋苑只准平日指定時間做嘈音工序。工期實際會長過師傅口講，預多一兩個星期。'] ] }
    };
    let found = 0, current = null;
    function setX(v){ pic.style.setProperty('--x', v + '%'); range.value = v; }
    function open(btn){
      const k = btn.dataset.k, d = DATA[k], r = btn.getBoundingClientRect(), z = root.getBoundingClientRect();
      current = btn;
      zoom.style.transformOrigin = `${r.left - z.left + r.width / 2}px ${r.top - z.top + r.height * .75}px`;
      if (!RM) zoom.style.transform = 'scale(7)';
      zoom.classList.add('go');
      title.textContent = '你嘅' + d.name + '：裝修前';
      hint.textContent = '搵出 3 隻伏（撳佢）';
      pic.classList.remove('open'); setX(100);
      pic.querySelectorAll('.spot').forEach(s => s.remove());
      tipEl.textContent = '👆 撳相入面嘅伏，睇下點樣避。';
      found = 0;
      d.spots.forEach(sp => {
        const f = FU[sp[0]], s = document.createElement('button');
        s.type = 'button'; s.className = 'spot'; s.style.left = sp[1] + '%'; s.style.top = sp[2] + '%'; s.setAttribute('aria-label', sp[3]);
        s.innerHTML = `<img src="${IMG}${f.img}.webp" alt="">`;
        pic.appendChild(s);
        s.addEventListener('click', () => {
          s.classList.add('found'); found++;
          tipEl.innerHTML = '';
          const b = document.createElement('b'); b.textContent = sp[3] + '（' + found + '/3）';
          tipEl.append(b, '：' + sp[4]);
          if (found === 3) unlock(d);
          else { const nx = pic.querySelector('.spot:not(.found)'); if (nx) nx.focus({ preventScroll: true }); }
        });
      });
      setTimeout(() => { room.classList.add('show'); const s1 = pic.querySelector('.spot'); if (s1) s1.focus({ preventScroll: true }); }, RM ? 0 : 650);
    }
    function unlock(d){
      setTimeout(() => {
        pic.classList.add('open');
        title.textContent = '你嘅' + d.name + '：避晒伏之後 ✨';
        hint.textContent = '⇆ 拖下條線，睇下裝修前後';
        if (RM) { setX(50); return; }
        let t0 = null;   // 由右邊掃到中間，示範拖法
        const step = ts => { if (t0 === null) t0 = ts; const k = Math.min(1, (ts - t0) / 900); setX(100 - 50 * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
        range.focus({ preventScroll: true });
      }, 700);
    }
    range.addEventListener('input', () => setX(range.value));
    root.querySelectorAll('.pick').forEach(b => b.addEventListener('click', () => open(b)));
    back.addEventListener('click', () => {
      room.classList.remove('show'); zoom.style.transform = ''; zoom.classList.remove('go');
      if (current) current.focus({ preventScroll: true });
    });
  })();

  /* ======================= Q 你係邊種裝修新手 ======================= */
  (function(){
    const box = document.querySelector('#fun-quiz .quizbox');
    if (!box) return;
    const Q = [
      { q: '師傅話「呢度要加 $8,000，唔加做唔到」，你會…', o: [['即刻俾，唔想阻住開工', 'a'], ['叫佢寫低書面報價先', 'b'], ['問下朋友：呢個價正唔正常？', 'c']] },
      { q: '今日放工去睇工地，你最先做咩？', o: [['周圍影相傳上家庭 group', 'a'], ['拎出驗收清單逐項剔', 'b'], ['同師傅傾偈，請佢飲嘢', 'c']] },
      { q: '揀裝修師傅，你最睇重…', o: [['價錢最平嗰個', 'a'], ['報價寫得最詳細嗰個', 'b'], ['朋友介紹、口碑好嗰個', 'c']] }
    ];
    const P = {
      a: ['🦸', '勇字當頭型', '衝得好快，但伏都中得好快——加價同甩期最鍾意你呢種人。開工前先用報價比較＋10 條紅旗清單過一次，衝都未遲。', ['睇伏位警示', '#traps']],
      b: ['🧐', '精打細算型', '你已經係半個專家！用預算計算器定好上限，再用分段驗收清單將你嘅細心變成有相有紀錄嘅證據。', ['試預算計算器', '#calc-budget']],
      c: ['🤝', '人情至上型', '識人好重要，但口碑唔等於合約。再熟都要書面報價、分期付款——跟住裝修旅程地圖逐步行就唔會漏。', ['睇裝修旅程', '#journey']]
    };
    let i = 0, ans = [];
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    function draw(focus){
      box.innerHTML = '';
      if (i < Q.length) {
        box.append(el('div', 'qn', '第 ' + (i + 1) + '／3 題'));
        const h = el('h3', null, Q[i].q); h.tabIndex = -1; box.append(h);
        const opts = el('div', 'opts');
        Q[i].o.forEach(o => { const b = el('button', null, o[0]); b.type = 'button'; b.addEventListener('click', () => { ans.push(o[1]); i++; draw(true); }); opts.append(b); });
        box.append(opts);
        if (focus) h.focus({ preventScroll: true });
      } else {
        const c = {}; ans.forEach(a => c[a] = (c[a] || 0) + 1);
        const k = Object.keys(c).sort((x, y) => c[y] - c[x] || x.localeCompare(y))[0], r = P[k];
        const res = el('div', 'result');
        res.append(el('div', 'em', r[0]));
        const h = el('h3', null, '你係「' + r[1] + '」'); h.tabIndex = -1; res.append(h);
        res.append(el('p', null, r[2]));
        const row = el('div', 'row');
        const go = el('a', 'fbtn primary', r[3][0] + ' →'); go.href = r[3][1];
        const again = el('button', 'fbtn ghost', '再測一次'); again.type = 'button'; again.addEventListener('click', () => { i = 0; ans = []; draw(true); });
        row.append(go, again); res.append(row); box.append(res);
        h.focus({ preventScroll: true });
      }
    }
    draw(false);
  })();
})();
