# 裝修無伏 / MakeMyHome — Build Spec for Claude Code CLI

> **Project 存放位置**：`~/Desktop/Stephanie-Google Drive/dev/MakeMyHome/`
> （呢個係 Stephanie 所有新 project／deliverable 嘅固定存放根目錄下嘅 project folder，唔好散放喺其他位置）
>
> 用法：喺呢個 repo 入面放呢份 spec，連同 `index.html`（現有靜態版）同 `preview.html`（UI mockup），
> 然後叫 Claude Code：`跟 CLAUDE_BUILD_SPEC.md 起晒成個 project，逐 phase 做，每個 phase 完成先落下一個`。

## 0. 產品一句話

香港裝修新手嘅全程管家 Web App：要預幾耐（工期）、點同設計師傾（需求書＋報價比較）、點樣驗收（分段 checklist＋相片記錄）。廣東話 UI。

## 1. 已鎖定嘅決定（唔好改，唔好問）

| 決定 | 內容 |
|---|---|
| Stack | 前端單頁 HTML/vanilla JS（唔用 framework）+ Supabase（Auth/Postgres/Storage）+ Vercel hosting |
| 登入 | 得一個方法：Google OAuth（Supabase Auth）。計算器/教學內容免登入，儲存/四大 module 要登入 |
| 名 | 廣東話主牌「裝修無伏」+ 英文副牌 MakeMyHome |
| 頁面分工 | `landing.html`（復古花磚 scroll journey，靜態內容+計算器）/ `app.html`（登入後工具，簡潔工具風） |
| Project 結構 | 一個 user 多個 project，UI 預設顯示一個；分享 link 係 Phase 2，今次唔做 |
| 電掣規劃 | 逐間房問卷形式，唔做平面圖拖拉 |
| 報價比較 | 公司卡片＋工序大類金額＋紅旗 checklist；AI 解析報價單係 Phase 2 |
| 驗收相片 | 綁工序 stage 層（唔綁逐個 checklist item），可加文字備註 |
| 相片壓縮 | 前端 canvas 壓縮到 ≤300KB／最長邊 1600px 先上載 |
| Phase 2（今次一律唔做） | read-only 分享 link、AI 報價解析、平面圖掣位、PWA、push notification |

## 2. 設計系統（兩頁共用 design tokens）

```css
--bg:#FAF6EF; --card:#FFF; --ink:#2D2A26; --ink2:#6B645B; --muted:#9A917F;
--accent:#C4622D;       /* terracotta 主行動色 */
--accent-soft:#F3DFD2;
--green:#3E5C50;        /* 深綠 header/成功 */
--green-soft:#E3EAE6;
--mustard:#D9A441;      /* 花磚黃/CTA on dark */
--line:#E8E0D2; --danger:#A8402F; --danger-soft:#F6E3DF;
--radius:14px; --shadow:0 2px 10px rgba(45,42,38,.07);
font: -apple-system, "Noto Sans TC", "PingFang HK", sans-serif;
```

- UI 細節以 `preview.html` 六個屏幕為準（Landing/登入/Dashboard/需求+電掣/報價比較/施工驗收）— 佢係視覺 spec。
- 靜態內容（旅程/計算器/伏位/字典/驗收清單文案）全部由 `index.html` 搬字過紙，唔使重寫。
- 手機優先：所有版面 375px 闊要正常。

## 3. Repo 結構

```
/
├── landing.html          # 免登入 landing（復古花磚 scroll journey）
├── app.html              # 登入後 app（SPA，hash routing #/dashboard #/needs 等）
├── js/
│   ├── supabase.js       # client 初始化（anon key 可以入 code，RLS 保護）
│   ├── auth.js           # Google OAuth login/logout/session guard
│   ├── db.js             # 所有 CRUD helper
│   ├── photos.js         # canvas 壓縮 + Storage 上載
│   └── content.js        # 靜態內容 data（由 index.html 抽出：STAGES/INSPECT/DICT/紅旗/工期邏輯）
├── css/shared.css
├── supabase/
│   └── migrations/001_init.sql
├── CLAUDE.md             # 起完之後寫：架構summary+點行dev+點deploy
└── vercel.json           # cleanUrls
```

## 4. Supabase Schema（migration 001）

```sql
-- 全部 table 都有 RLS：owner-only（auth.uid() = user_id）
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                -- 例：太古城 480呎
  flat_type text,                    -- public/hos/private/old
  size_sqft int,
  scope text,                        -- full/partial/light
  start_date date,
  budget_cap int,
  created_at timestamptz default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null,
  name text not null,                -- 客飯廳/主人房/廚房/浴室…
  sort int default 0,
  answers jsonb default '{}'         -- 問卷答案：{usage, storage, furniture, sockets:{bedside:2,tv:4,ac:1,lan:1,extra:""}, lighting}
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null,
  company text not null,
  total int,
  breakdown jsonb default '{}',      -- {wet:128000, me:86000, wood:142000, paint:52000, misc:20000}
  flags jsonb default '{}',          -- 10 條紅旗 boolean map（見 §5.3）
  score int,                         -- 由 flags 計出 0-10
  status text default 'pending',     -- pending/signed/rejected
  file_path text                     -- Storage 入面嘅報價單 pdf/相（可 null）
);

create table stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null,
  key text not null,                 -- demo/me/wet/wood/paint/fit/clean
  started_on date,
  finished_on date,
  inspected_on date,
  checklist jsonb default '{}',      -- {item_index: true}
  note text,
  unique(project_id, key)
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  user_id uuid not null,
  path text not null,                -- storage path
  caption text,
  created_at timestamptz default now()
);
```

- RLS policy 每個 table 四條（select/insert/update/delete）全部 `using (auth.uid() = user_id)`，insert 用 `with check`。
- Storage bucket `reno-photos`（private）+ policy：只可以讀寫自己 `{user_id}/` prefix 之下嘅 object。報價單檔案都放呢個 bucket（`{user_id}/quotes/…`）。

## 5. 功能 Spec

### 5.1 Landing（landing.html）
- 復古配色＋花磚（vintage cement-tile）圖騰 scroll journey，每 section 一個色調場景；hero：「裝修無伏 / MAKEMYHOME」＋兩個 CTA（免費開始→app.html；先試計算器→錨點）。
- Section 順序：hero → 三大痛點（幾耐/點傾/點驗收，用消委會 1,205 宗投訴做 hook）→ 工期計算器（互動，免登入）→ 預算計算器 → 裝修旅程 7 步 → 伏位警示 8 條 → 術語字典（搜尋）→ 「儲存你嘅計劃」CTA。
- 計算器結果下面加一粒「儲存到我嘅 project →」掣，撳咗未登入就跳去 app.html 登入，登入後帶住個 payload（用 sessionStorage 過渡）自動開 project。

### 5.2 App（app.html，hash routes）
- **#/login**：一粒 Google 掣（見 preview ②）；已有 session 自動跳 dashboard。
- **#/dashboard**：project 下拉切換＋「開新 project」；四格 module 卡各自顯示進度 summary；頂部「而家階段」卡＋最近一個落訂/驗收提醒（由 start_date＋工期邏輯計）。
- **#/needs**：房間 chips（可加/刪/改名）→ 每間房 4 步 wizard：①用途+大嚿傢俬 ②儲物量 ③電掣插座網絡（每項 counter＋建議文案，照 preview ④）④燈光。完成後「匯總」頁生成兩份嘢：需求書（畀設計師）＋全屋掣位清單（逐房 table：位置/類型/數量/建議高度）。兩份都有「複製」+「下載 .txt/.pdf(print css)」掣。
- **#/quotes**：公司卡片 CRUD；輸入總價＋5 個大類金額＋10 條紅旗 checkbox；score = 10 − 中旗數（加權：一口價/首期>20%/平市價>20% 各扣 2）；卡片色條按 score 綠/黃/紅；下面自動對比 table；可上載報價單檔案；卡片可 mark「已簽約」（dashboard 就顯示嗰間）。
- **#/build**：七個工序卡（demo→clean），每卡：mark 開工/完成/驗收日期（date picker）、驗收 checklist（用 index.html 嘅 INSPECT 資料，泥水/水電/木工/油漆/完工五組對應返工序）、相簿（grid＋「＋」上載，multiple，壓縮後上 Storage）、備註 textarea（autosave debounce 800ms）。工序卡 border 色：done 綠/進行中 橙/未開始 灰。
- 所有寫入即時 optimistic update＋失敗 toast。

### 5.3 十條紅旗（quotes.flags keys）
`no_br`(冇商業登記) `no_itemize`(一口價冇分項,權重2) `no_brand`(冇列品牌型號) `misc_over5`(雜項>5%) `deposit_over20`(首期>20%,權重2) `below_market`(平市價>20%,權重2) `no_timeline`(冇寫工期) `no_penalty`(冇延誤條款) `no_warranty`(冇保養期) `verbal_promise`(口頭承諾唔肯寫低)

## 6. 執行 Phases（每個 phase 完成要 verify 先落下一個）

1. **Phase 1 — Supabase**：開 project（free tier）→ 行 migration → 設 RLS → 開 storage bucket＋policy → `js/supabase.js`。Verify：用 service role 插一row，anon 讀唔到人哋嘅。
2. **Phase 2 — Auth**：Google OAuth flow＋session guard＋logout。Verify：手動或 e2e 確認 redirect 返嚟有 session。
3. **Phase 3 — App 四 module**：照 §5.2 起晒，用 preview.html 做視覺對照。Verify：Playwright 行晒 CRUD happy path（可以用 supabase local 或 test user）。
4. **Phase 4 — Landing**：照 §5.1；靜態內容由 index.html 搬。Verify：Lighthouse mobile ≥ 90、計算器照 work。
5. **Phase 5 — Deploy**：push GitHub → Vercel（env 冇 secret，anon key 直接入 code）→ smoke test production URL。
6. 每個 phase 完成：update CLAUDE.md ＋ git commit。

## 7. 人手步驟（Claude Code 做唔到，要提 Stephanie 做）

1. **Google OAuth client**：Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID（Web）→ Authorized redirect URI 填 Supabase callback（`https://<project-ref>.supabase.co/auth/v1/callback`）→ 將 client id/secret 貼入 Supabase Dashboard → Auth → Providers → Google。
2. **Vercel import**：第一次要喺 vercel.com 撳 Import Git Repository。
3. Production domain 定咗之後，記住加返入 Supabase Auth → URL Configuration（Site URL + redirect allowlist）。

## 8. 驗收標準（成個 build 嘅 Definition of Done）

- [ ] 未登入：landing 全部內容＋兩個計算器正常
- [ ] Google 登入後開到 project，四個 module CRUD 正常，F5 資料仲喺度
- [ ] 第二個 Google 戶口登入完全睇唔到第一個戶口嘅資料（RLS）
- [ ] 上載 3MB 相自動壓到 ≤300KB，相簿顯示、刪除正常
- [ ] 掣位清單/需求書 export（複製＋print）正常
- [ ] 手機 375px 闊全部版面唔爆
- [ ] 0 console error；Playwright e2e 全綠
