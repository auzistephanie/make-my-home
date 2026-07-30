// Static content shared by app.html — lifted from index.html (STAGES / INSPECT) plus
// the Phase-3 additions needed to drive the app UI (flat/scope option labels, the 10
// quote red flags with their scoring weights, and socket-type metadata for the
// 掣位清單 export). DICT (術語字典) stays in index.html — that is Phase 4 (landing) turf.

// ---------- 工期工序（七個工序，key 對應 reno_stages.key）----------
// Copied verbatim from index.html's STAGES (used there for the duration calculator;
// here it drives #/build's seven stage cards).
const STAGES = [
  { k: 'demo',  n: '保護＋拆卸',     lo: 3,  hi: 5  },
  { k: 'me',    n: '水電改動',       lo: 5,  hi: 7,  note: '完成後第 1 個驗收位' },
  { k: 'wet',   n: '泥水鋪磚',       lo: 10, hi: 14, note: '含 48 小時試水・第 2 個驗收位' },
  { k: 'wood',  n: '木工訂造',       lo: 7,  hi: 10 },
  { k: 'paint', n: '油漆批盪',       lo: 5,  hi: 7  },
  { k: 'fit',   n: '潔具燈掣安裝',   lo: 3,  hi: 5  },
  { k: 'clean', n: '清潔交付',       lo: 2,  hi: 3,  note: '完工總驗收' },
];

// ---------- 驗收 checklist（五組，對應 index.html 嘅 INSPECT）----------
// Copied verbatim from index.html's INSPECT.
const INSPECT = [
  { t: '水電驗收（入牆前・最後補救機會）', tag: '驗收位 ①', items: [
    ['對圖核位', '逐個插座、燈掣、燈位對返設計圖位置同高度，錯咗而家改係免費，鋪咗磚先改係災難'],
    ['電線規格', '冷氣、熱水爐等大電量用 2.5mm² 以上獨立迴路；問清楚用咩牌子線（金龍／CMW 等）'],
    ['喉管走位', '影低全屋開槽走線相！日後鑽牆掛嘢先知邊度有線有喉'],
    ['水管試壓', '新水管應加壓測試冇跌壓；冷熱水喉分色（藍／紅）'],
    ['去水暢順', '每個去水位倒水測試，聽下有冇異響、倒返流'],
    ['漏電掣測試', '撳漏電斷路器測試掣，要即刻跳掣'],
  ]},
  { t: '泥水驗收（鋪磚＋防水）', tag: '驗收位 ②', items: [
    ['48 小時試水', '浴室封去水位放水浸 48 小時，落層或隔籬房天花牆身冇濕印先合格 — 呢項唔合格其他都唔使講'],
    ['敲磚驗空鼓', '硬幣逐塊磚敲，空心聲＝空鼓；單塊空鼓面積唔超過 15%、每 100 塊唔多過 3–5 塊為行內容忍線，浴室廚房牆磚要更嚴'],
    ['磚縫平整', '磚與磚高低差唔超過 0.5mm（指甲刮唔到級），縫闊均勻'],
    ['去水斜度', '地台落水位放乒乓球／倒水，要自己流向去水口，唔積水'],
    ['陰陽角垂直', '牆角用水平尺 app 度，批盪要直'],
    ['窗邊打膠', '窗框四邊防水膠完整冇罅（滲水重災區）'],
  ]},
  { t: '木工驗收（訂造傢俬）', tag: '', items: [
    ['門櫃開合', '每一度門、每一個櫃桶開關 10 次：順唔順、有冇異聲、自動回彈正唔正常'],
    ['縫位均勻', '櫃門與櫃身縫位闊窄一致（目測 2mm 內差異）'],
    ['封邊完整', '板材封邊冇崩、冇起泡、冇甩膠；聞下有冇刺鼻甲醛味'],
    ['五金對版', '鉸鏈、路軌、拉手品牌對返報價單（Blum／Hettich 定雜牌差好遠）'],
    ['水平垂直', '吊櫃、層板放水平尺 app 檢查'],
    ['入牆穩固', '搖下高櫃、吊櫃，唔應該郁'],
  ]},
  { t: '油漆驗收', tag: '', items: [
    ['側光照牆', '電筒貼牆斜照，睇批盪波浪紋、砂紙痕、釘眼'],
    ['色澤均勻', '日光＋開燈各睇一次，冇色差、冇接痕'],
    ['冇甩色裂紋', '近牆腳、門框位睇裂紋；手背輕擦唔甩粉'],
    ['收邊乾淨', '天花線、牆腳線、掣面四邊油得直，冇油污染到其他位置'],
  ]},
  { t: '完工總驗收（畀尾數前）', tag: '驗收位 ③', items: [
    ['全屋水電再測', '每個插座用測試器插一次、每盞燈開一次、冷熱水每個龍頭放一次'],
    ['門窗開關', '每度門窗開合＋上鎖測試，膠邊完整'],
    ['對單核數', '逐項對返報價單：有冇做漏、物料對唔對版、加減工程數目啱唔啱'],
    ['執漏清單', '發現問題書面列 snag list，寫明執修限期，執完先付尾數'],
    ['攞齊文件', '保養卡、電器單據、油漆磁磚型號（日後補油補磚要用）、水電走線相'],
    ['保養期確認', '書面確認保養期（3–12 個月）同覆蓋範圍'],
  ]},
];

// Which STAGES key each INSPECT group belongs to. demo（保護拆卸）同 fit（潔具燈掣安裝）
// 喺 index.html 冇對應嘅獨立驗收組，#/build 嗰兩張卡唔顯示 checklist（只有日期＋相簿＋備註）。
const STAGE_INSPECT_MAP = { me: 0, wet: 1, wood: 2, paint: 3, clean: 4 };

// ---------- Project 建立表單 options（跟 index.html 工期計算器 select 一致）----------
const FLAT_TYPES = [
  { value: 'public',  label: '公屋' },
  { value: 'hos',     label: '居屋（清水房）' },
  { value: 'private', label: '私樓' },
  { value: 'old',     label: '舊樓／唐樓（30 年以上）' },
];
const SCOPES = [
  { value: 'full',    label: '全屋翻新（拆晒重做）' },
  { value: 'partial', label: '局部裝修（廚廁＋油漆為主）' },
  { value: 'light',   label: '簡單翻新（油漆＋地板＋執漏）' },
];

// ---------- 報價比較：十條紅旗（spec §5.3）----------
// weight 2 的三條：一口價冇分項 / 首期>20% / 平市價>20%；其餘 weight 1。
const FLAGS = [
  { key: 'no_br',          label: '冇商業登記',                 weight: 1 },
  { key: 'no_itemize',     label: '一口價，冇分項報價',          weight: 2 },
  { key: 'no_brand',       label: '冇列明品牌型號',              weight: 1 },
  { key: 'misc_over5',     label: '雜項費 > 5%',                 weight: 1 },
  { key: 'deposit_over20', label: '首期 > 20%',                  weight: 2 },
  { key: 'below_market',   label: '平市價 > 20%（可疑低價）',    weight: 2 },
  { key: 'no_timeline',    label: '冇寫工期',                    weight: 1 },
  { key: 'no_penalty',     label: '冇延誤條款',                  weight: 1 },
  { key: 'no_warranty',    label: '冇保養期',                    weight: 1 },
  { key: 'verbal_promise', label: '口頭承諾，唔肯寫落紙',        weight: 1 },
];

// score = 10 − Σ(checked flag 權重)，clamp 0–10
function computeQuoteScore(flags) {
  const checked = flags || {};
  let deduction = 0;
  FLAGS.forEach(f => { if (checked[f.key]) deduction += f.weight; });
  return Math.max(0, Math.min(10, 10 - deduction));
}
function scoreColor(score) {
  if (score >= 8) return 'var(--green)';
  if (score >= 5) return 'var(--mustard)';
  return 'var(--danger)';
}

// 報價 5 大類金額（breakdown jsonb 嘅 key）
const BREAKDOWN_CATS = [
  { key: 'wet',   label: '泥水' },
  { key: 'me',    label: '水電' },
  { key: 'wood',  label: '木工' },
  { key: 'paint', label: '油漆' },
  { key: 'misc',  label: '雜項' },
];

// ---------- 需求規劃：電掣插座類型（掣位清單建議高度，新增內容 — index.html 冇呢部份，
// 因為要生成掣位清單表就需要呢個對照表；spec 冇寫死數值，用裝修界普遍建議高度）----------
const SOCKET_TYPES = [
  { key: 'bedside', label: '床頭插座',        height: '座檯面上約 20cm（離地約 90cm）', hint: '每邊最少 1 個＋USB 位' },
  { key: 'tv',       label: '電視／娛樂區插座', height: '電視背板約 120cm，或地台上 30cm（藏喉款）', hint: '電視＋機頂盒＋遊戲機＋router' },
  { key: 'ac',        label: '冷氣獨立迴路',    height: '按冷氣機出線口位置（獨立迴路，唔同插座共用）', hint: '2.5mm² 以上獨立迴路' },
  { key: 'lan',       label: '網絡 LAN／Wi-Fi 位', height: '書枱面上約 30cm，或牆身離地 30cm', hint: '在家工作建議書枱位有 LAN' },
];

// ---------- 需求規劃 wizard 步驟定義（4 步，對應 reno_rooms.answers 結構）----------
const ROOM_WIZARD_STEPS = ['usage', 'storage', 'sockets', 'lighting'];
const STORAGE_TYPE_OPTIONS = ['衣櫃', '嵌入式收納', '雜物房／儲物閣', '層架', '鞋櫃'];

// ---------- Dashboard「而家階段」提醒文案（逐 stage key，摘自 index.html 工期計算器
// 嘅 reminders 內容，濃縮做每個工序一句提示）----------
const STAGE_TIPS = {
  demo:  '',
  me:    '📍 驗收①：入牆前逐條線、逐個掣位對返設計圖核對',
  wet:   '⏱️ 記住：完成前要 48 小時試水，合格先剔驗收②同過數',
  wood:  '🔔 訂造傢俬圖則要喺木工開工前 6 星期確認落單（訂造期普遍 6–8 週）',
  paint: '',
  fit:   '',
  clean: '📍 驗收③：逐項對單、列 snag list，執完先付尾數',
};

// 工期換算 factor —— 抄自 index.html 工期計算器，畀 dashboard 用 start_date 估算
// 每個工序嘅預計完成日（lo/hi 平均數 × factor）。
function scheduleFactor(type, size, scope) {
  let f = 1;
  if (type === 'public') f *= 0.8; if (type === 'hos') f *= 0.9; if (type === 'old') f *= 1.2;
  if (size < 300) f *= 0.85; else if (size >= 500 && size < 800) f *= 1.2; else if (size >= 800) f *= 1.45;
  if (scope === 'partial') f *= 0.6; if (scope === 'light') f *= 0.35;
  return f;
}
// 回傳每個 stage 相對 start_date 嘅累積完成日數（單點估算，用 (lo+hi)/2）。
function scheduleOffsets(project) {
  const f = scheduleFactor(project.flat_type, project.size_sqft || 450, project.scope);
  let acc = 0;
  return STAGES.map(s => {
    let days = Math.round(((s.lo + s.hi) / 2) * f);
    if (project.scope === 'light' && (s.k === 'me' || s.k === 'wet')) days = Math.max(1, Math.round(days * 0.5));
    acc += days;
    return { key: s.k, endOffsetDays: acc };
  });
}

// ---------- 術語字典（Phase 4 landing.html 用）----------
// Copied verbatim from index.html's DICT (21 terms) — landing.html's 術語字典 section
// renders this list with the same search-filter behaviour as index.html.
const DICT = [
  ['清水房', '發展商交樓時得混凝土同基本批盪，咩都冇 — 居屋常見，裝修要由零做起，工期預長啲'],
  ['交吉', '單位交出時清空無人無雜物嘅狀態'],
  ['批盪', '牆身抹灰打底，令牆面平整先可以油漆；批得靚唔靚直接影響油漆效果'],
  ['大執／細執', '大執＝全屋翻新拆晒重做；細執＝局部裝修執靚佢'],
  ['泥水', '鋪磚、砌牆、防水、批盪呢類濕作工序嘅統稱'],
  ['空鼓', '磁磚同牆／地黏合唔實，敲落去空心聲，日後易裂易甩'],
  ['去水', '排水。「去水斜度」即係地台要斜向去水口唔積水'],
  ['來去水', '供水（來水）同排水（去水）系統，改廚廁必講'],
  ['假天花', '原有天花下加建嘅天花，用嚟藏冷氣喉、燈槽線'],
  ['地台', '抬高咗嘅地面結構，可以儲物；同「地板」唔同'],
  ['訂造傢俬', '度身訂做嘅固定傢俬（衣櫃、廚櫃、地台床），交貨期普遍 6–8 星期'],
  ['主力牆', '承重結構牆，拆咗會影響全幢安全，犯法！拆牆前必須搵專業人士確認'],
  ['跳掣', '斷路器因短路／漏電／過載自動斷電；新裝修成日跳掣即係水電有問題'],
  ['士敏土／英泥', '水泥。行內師傅好多時講「落石屎」「唧英泥」'],
  ['嚡面／滑面', '磁磚表面質感：嚡面防滑（浴室地）、滑面易抹（牆磚）'],
  ['入則', '向屋宇署／房署入紙申請批准改動圖則，涉結構或走水位多數要'],
  ['僭建', '未經批准嘅建築改動，隨時收清拆令，買賣樓仲會影響按揭'],
  ['執漏', '完工後修正瑕疵嘅工序；書面列低叫 snag list'],
  ['甩底', '師傅接咗單但唔出現／中途消失，裝修界最常見投訴之一'],
  ['釘契', '口語指單位有法律問題被「釘」；裝修僭建嚴重可能導致'],
  ['天花線／牆腳線', '天花同牆、牆同地交界嘅裝飾線條收口'],
  ['防水層', '浴室廚房地台牆身嘅防滲塗層，一般做 2–3 層＋上返一定高度（浴室牆建議 1.8 米）'],
];
