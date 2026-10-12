// 首頁 3D 入屋開場（2026-10-12）— 捲動帶動鏡頭：屋外 → 箭咀飛入門口 → 開門 → 入屋 → 四張功能卡。
// 配合 css/landing3d.css；純 CSS 3D，冇外部函式庫；prefers-reduced-motion 直接顯示屋入面靜態畫面。
(function(){
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.getElementById('h3d');
  if (!intro) return;
  const tileA = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#F3EBDA"/><g fill="#3E5C50"><path d="M40 12 C46 24 46 32 40 40 C34 32 34 24 40 12Z"/><path d="M40 68 C46 56 46 48 40 40 C34 48 34 56 40 68Z"/><path d="M12 40 C24 34 32 34 40 40 C32 46 24 46 12 40Z"/><path d="M68 40 C56 34 48 34 40 40 C48 46 56 46 68 40Z"/></g><g fill="#B4532B"><path d="M20 20 C30 22 36 28 40 40 C28 36 22 30 20 20Z"/><path d="M60 20 C58 30 52 36 40 40 C44 28 50 22 60 20Z"/><path d="M20 60 C22 50 28 44 40 40 C36 52 30 58 20 60Z"/><path d="M60 60 C50 58 44 52 40 40 C52 44 58 50 60 60Z"/></g><circle cx="40" cy="40" r="6" fill="#D9A441"/><g fill="#3E5C50"><path d="M0 0 L14 0 A14 14 0 0 1 0 14Z"/><path d="M80 0 L80 14 A14 14 0 0 1 66 0Z"/><path d="M0 80 L0 66 A14 14 0 0 1 14 80Z"/><path d="M80 80 L66 80 A14 14 0 0 1 80 66Z"/></g><rect width="80" height="80" fill="none" stroke="#D2C6AE" stroke-width="1.5"/></svg>';
  const tileD = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#F3EBDA"/><path d="M20 2 L38 20 L20 38 L2 20Z" fill="none" stroke="#3E5C50" stroke-width="3"/><rect x="16" y="16" width="8" height="8" fill="#D9A441" transform="rotate(45 20 20)"/><g fill="#B4532B"><circle cx="0" cy="0" r="4"/><circle cx="40" cy="0" r="4"/><circle cx="0" cy="40" r="4"/><circle cx="40" cy="40" r="4"/></g><rect width="40" height="40" fill="none" stroke="#D2C6AE" stroke-width="1"/></svg>';
  intro.style.setProperty('--tileA', 'url("data:image/svg+xml,' + encodeURIComponent(tileA) + '")');
  intro.style.setProperty('--tileD', 'url("data:image/svg+xml,' + encodeURIComponent(tileD) + '")');

  const stage = document.getElementById('h3d-stage'), world = document.getElementById('h3d-world'),
        door = document.getElementById('h3d-door'), arrow = document.getElementById('h3d-arrow'), lamp = document.getElementById('h3d-lamp');
  const outs = [...stage.querySelectorAll('[data-out]')], ins = [...stage.querySelectorAll('[data-in]')], hss = [...stage.querySelectorAll('.hs')];
  const doorBase = door.style.transform; hss.forEach(h => h.dataset.base = h.style.transform);

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('mousemove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });
  // 橫屏：按闊度／高度縮到放得晒；直屏（手機）：按高度縮，左右裁走少少，屋入面先會填滿個畫面
  function fit(){
    const portrait = innerHeight > innerWidth;
    const k = portrait ? Math.min(1, innerHeight / 1150) : Math.min(1, innerWidth / 1100, innerHeight / 760);
    intro.style.setProperty('--s', k.toFixed(3));
  }
  fit(); addEventListener('resize', fit);

  // 效能（2026-10-13 修「捲落去有啲 crash／卡」）：
  // ①只寫有變嘅值（cache），唔再每格重寫幾十個 style；
  // ②唔再喺 .stage 設 --p/--o1… 呢類會繼承落成棵 3D 樹嘅變數（每格令全部元素重算 style），改為直接寫落用到佢嘅元素；
  // ③先讀門口位置再寫，避免強制 layout；④冇捲動／滑鼠未郁／開場唔喺畫面就停 rAF，唔會一直燒 CPU。
  const q = sel => [...stage.querySelectorAll(sel)];
  const sunCloud = q('.sun, .cloud'), ov1 = q('.ov1, .hint'), ov2 = q('.ov2'), ov3 = q('.ov3'), xvig = q('.xvig'), progBar = q('.prog i');
  const ctas = stage.querySelector('.ov1 .ctas');
  const cache = new WeakMap();
  function put(el, prop, val) {           // 值冇變就唔寫
    let c = cache.get(el); if (!c) cache.set(el, c = {});
    if (c[prop] === val) return;
    c[prop] = val;
    if (prop[0] === '-') el.style.setProperty(prop, val); else el.style[prop] = val;
  }
  const putAll = (els, prop, val) => els.forEach(el => put(el, prop, val));
  function toggleCls(el, cls, on) { const c = cache.get(el) || {}; if (c['_' + cls] === on) return; cache.set(el, Object.assign(c, { ['_' + cls]: on })); el.classList.toggle(cls, on); }

  let lastP = -1;
  function render(){
    const vh = innerHeight, r = intro.getBoundingClientRect();
    const p = RM ? 1 : clamp(-r.top / (r.height - vh), 0, 1);
    // 開場捲完之後收起頂部 nav（佢係 position:fixed，唔收會遮住下面計算器）
    toggleCls(intro, 'h3d-past', r.bottom < vh * 0.35);
    mx += (tmx - mx) * .08; my += (tmy - my) * .08;

    // 箭咀飛向門口：喺寫任何嘢之前讀位置（用上一格嘅 layout，唔會強制重排）；箭咀消失咗就唔使讀
    const fly = ease(seg(p, .04, .4)), arrowOp = RM ? 0 : 1 - seg(p, .36, .44);
    let ax = 0, ay = 0;
    if (arrowOp > 0) {
      const dr = door.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const sx = sr.width / 2, sy = sr.height * .8, tx = dr.left + dr.width / 2 - sr.left, ty = dr.top + dr.height * .55 - sr.top;
      ax = lerp(sx, tx, fly); ay = lerp(sy, ty, fly) - Math.sin(fly * Math.PI) * sr.height * .12;
    }

    // camera: approach (0–.38), door opens (.34–.52), walk in (.5–.76), settle (.76–1)
    const a = ease(seg(p, 0, .38)), w = ease(seg(p, .5, .76)), s = ease(seg(p, .76, 1));
    let cz = lerp(-2500, -420, a); cz = lerp(cz, 450, w);   // 停喺房間前緣後面：再近，最近鏡頭嗰截牆會被放大到超出繪圖上限
    const ry = lerp(-16, 0, a) + lerp(0, 4, s);
    const rx = lerp(-5, 0, a) + lerp(0, -3, w);
    const cy = lerp(340, 0, a);   // 開頭屋放低，讓位畀標題同按鈕
    const f = n => n.toFixed(2);
    put(world, 'transform', `translate3d(0,${f(cy)}px,${f(cz)}px) rotateX(${f(rx + (RM ? 0 : -my * 4))}deg) rotateY(${f(ry + (RM ? 0 : mx * 6))}deg)`);
    put(door, 'transform', doorBase + ` rotateY(${f(-108 * ease(seg(p, .34, .52)))}deg)`);

    const outside = 1 - seg(p, .6, .645);
    const outOp = outside.toFixed(3), outVis = outside <= .001 ? 'hidden' : 'visible';
    outs.forEach(el => { put(el, 'opacity', outOp); put(el, 'visibility', outVis); });
    const inItems = (p > .33 && outside > .5) || outside < .5 ? 'visible' : 'hidden';   // CSS 3D 深度排序唔可靠：屋入面嘅細件喺屋外時收埋
    ins.forEach(el => put(el, 'visibility', inItems));
    put(lamp, 'visibility', outside < .5 ? 'visible' : 'hidden');
    putAll(sunCloud, '--outside', outOp);
    putAll(xvig, '--cross', Math.sin(Math.PI * seg(p, .57, .69)).toFixed(3));
    toggleCls(stage, 'inside', p > .64);
    toggleCls(stage, 'skip-gone', p < .12 || p > .78);   // 開頭「捲落去」提示淡出之後先出（唔好同佢疊埋），功能卡出嚟之前收起

    putAll(ov1, '--o1', (1 - seg(p, .05, .18)).toFixed(3));
    putAll(ov2, '--o2', (seg(p, .28, .36) * (1 - seg(p, .52, .6))).toFixed(3));
    putAll(ov3, '--o3', seg(p, .8, .9).toFixed(3));
    putAll(progBar, '--p', p.toFixed(3));
    put(ctas, 'pointerEvents', p < .08 ? 'auto' : 'none');

    hss.forEach((h, i) => {
      const t = ease(seg(p, .78 + i * .045, .86 + i * .045));
      put(h, '--hso', t.toFixed(3));
      put(h, 'transform', h.dataset.base + ` translateY(${f((1 - t) * 40)}px) scale(${(.7 + .3 * t).toFixed(3)})`);
      put(h, 'pointerEvents', t > .9 ? 'auto' : 'none');
    });

    put(arrow, 'opacity', arrowOp.toFixed(3));
    if (arrowOp > 0) put(arrow, 'transform', `translate(${f(ax - 43)}px,${f(ay - 55)}px) scale(${lerp(1, .22, fly).toFixed(3)})`);
    toggleCls(arrow, 'bob', p < .02);

    const moving = Math.abs(p - lastP) > 1e-4 || Math.abs(tmx - mx) > .002 || Math.abs(tmy - my) > .002;
    lastP = p;
    return moving;
  }

  // 按需要先跑：有捲動／resize／滑鼠郁先開 rAF，靜止咗或者開場唔喺畫面就停
  let raf = 0, onScreen = true;
  function tick(){ raf = 0; if (render() && onScreen) kick(); }
  function kick(){ if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  if (!RM) addEventListener('mousemove', () => { if (onScreen) kick(); }, { passive: true });
  document.addEventListener('visibilitychange', kick);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen) kick(); }).observe(intro);
  }
  render(); kick();
})();
