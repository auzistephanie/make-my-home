# MakeMyHome / 裝修無伏

> 香港裝修新手嘅全程管家：要預幾耐（工期）、點同設計師傾（需求書＋報價比較）、點樣驗收（分段 checklist＋相片記錄）。廣東話 UI。
> 詳細 build spec（架構、schema、phase 拆解）→ `CLAUDE_BUILD_SPEC.md`，開工前一定要睇。

## ⚙️ Standards（MANDATORY — 正本：`stephanie-personal/docs/ai-governance/06-STANDARDS.md`，改規則只改正本）

Push（`github_push.py` 永不 git CLI・HTTPS・一次 run 一 commit）・寫入分流（改動記錄 → `CHANGELOG.md` **頂部**，唔准 append 落本檔；本檔上限 100 行/6KB）・清理 mv `_to_delete/`・改舊檔先 `.bak-YYYYMMDD`・方向性決定先 preview・改完以用家身份 run 一次先報完成・governance 00–05（派 subagent 先讀 01+03；報完成前過 02 §R2；冇 mount stephanie-personal → 叫 Stephanie 連埋）。詳文＋例外表 → 正本。

## 現況（2026-07-30）

| 檔案 | 狀態 |
|---|---|
| `index.html` | 靜態版已完成＋Playwright 驗證通過 — 工期/預算計算器、裝修旅程、設計師溝通指南、驗收清單、伏位警示、術語字典，全部免登入 |
| `preview.html` | UI mockup（假數據）— Landing／登入／Dashboard／需求+電掣／報價比較／施工驗收 六個屏幕，畀 Stephanie 睇過＋批准 |
| `CLAUDE_BUILD_SPEC.md` §6 Phase 1（Supabase schema/RLS/storage） | ✅ 已完成（2026-07-30，見 CHANGELOG）——表名由 `projects/rooms/quotes/stages/photos` 改咗做 `reno_` 前綴（共用 project 避免撞名） |
| §6 Phase 2（Google OAuth Auth） | 🟡 code 寫咗（`js/auth.js`），卡喺 Stephanie 人手步驟（Google Cloud Console＋Supabase Dashboard，見下面「人手步驟」）先可以真正驗證 |
| §6 Phase 3（App 四大 module） | ✅ 已完成（2026-07-30）——`app.html`＋`js/db.js`/`photos.js`/`content.js`＋`css/shared.css`；真 CRUD 待 OAuth 通咗先可以真正跑（同 Phase 2 卡住嘅係同一個人手步驟） |
| §6 Phase 4（Landing page） | ⬜ 未開工 |
| §6 Phase 5（Deploy Vercel） | ⬜ 未開工 |

## 下一步

跟 `CLAUDE_BUILD_SPEC.md` §6 嘅 5 個 phase 順序起：Supabase schema → Auth → App 四大 module → Landing page（brand-landing-page skill）→ Deploy。每個 phase 完成要過下面 DoD 先落下一個。Phase 1 已完成，而家到 Phase 2（Auth）。

## 已鎖定嘅產品決定（唔好重新問）

- Stack：單頁 vanilla JS + Supabase（Auth/DB/Storage）+ Vercel
- 登入分界：計算器/教學內容免登入；報價比較／需求規劃／驗收記錄要 Gmail 登入
- 電掣規劃：逐間房問卷（唔做平面圖拖拉）
- 報價比較：公司卡片＋大類金額＋10 條紅旗 checklist（唔做 AI 解析，留 Phase 2）
- 驗收相片：綁工序 stage 層，可加備註
- 名：廣東話主牌「裝修無伏」＋英文副牌 MakeMyHome

完整清單同理由 → `CLAUDE_BUILD_SPEC.md` §1。

## ✅ 完成前檢查（本 repo 專屬 DoD；通用四格 → 02-JUDGMENT §R2）

1. 靜態頁有改 → 瀏覽器實開 `index.html` 行受影響 flow（例：計算器輸入 → 結果啱）
2. 起 phase → 對照 `CLAUDE_BUILD_SPEC.md` §6 該 phase 驗收標準逐條過，全過先落下一個
3. Push：`python3 scripts/github_push.py "<msg>"`＋核實 GitHub HEAD（→ Standards §S1）

## Git / Auto-push

> 正本 → ⚙️ Standards §S1。Repo：`https://github.com/auzistephanie/make-my-home.git`；push kit（`.env` token／`scripts/github_push.py`／registry 行）已裝好。

## Project 存放位置

`~/Desktop/Stephanie-Google Drive/dev/MakeMyHome/`（Stephanie 所有新 project 嘅固定存放規則）
