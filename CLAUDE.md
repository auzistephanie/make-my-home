# MakeMyHome / 裝修無伏

> 香港裝修新手嘅全程管家：要預幾耐（工期）、點同設計師傾（需求書＋報價比較）、點樣驗收（分段 checklist＋相片記錄）。廣東話 UI。
> 詳細 build spec（架構、schema、phase 拆解）→ `CLAUDE_BUILD_SPEC.md`，開工前一定要睇。

## ⚙️ Standards（MANDATORY — 正本：`stephanie-personal/docs/ai-governance/STANDARDS.md`，改規則只改正本）

Push（`github_push.py`，永不 git CLI・HTTPS・一 run 一 commit・**開工前 `--check`**・**收工即推**・三道閘 刪檔／SHA／交叉 review，撞閘唔好即刻 `--force`）・寫入分流（改動記錄 → `CHANGELOG.md` **頂部**；本檔上限 100 行/6KB）・清理 mv `_to_delete/`・方向性決定先 preview（02 §R3）・改完以用家身份 run 一次先報完成・governance 00–06（派工 01 §1＋03 模板；完成前過 02 §R2；冇 mount stephanie-personal 就叫 Stephanie 連埋）。**Codex 讀同層 `AGENTS.md`**。詳文＋例外表 → 正本。

## 現況（2026-07-30）

| 檔案 | 狀態 |
|---|---|
| `index.html` | 靜態版已完成＋Playwright 驗證通過 — 工期/預算計算器、裝修旅程、設計師溝通指南、驗收清單、伏位警示、術語字典，全部免登入 |
| `preview.html` | UI mockup（假數據）— Landing／登入／Dashboard／需求+電掣／報價比較／施工驗收 六個屏幕，畀 Stephanie 睇過＋批准 |
| `CLAUDE_BUILD_SPEC.md` §6 Phase 1（Supabase schema/RLS/storage） | ✅ 已完成（2026-07-30，見 CHANGELOG）——表名由 `projects/rooms/quotes/stages/photos` 改咗做 `reno_` 前綴（共用 project 避免撞名） |
| §6 Phase 2（Google OAuth Auth） | ✅ 已完成——`js/auth.js`＋Google Cloud Console／Supabase Dashboard 人手步驟都做咗；2026-09-13 由 auth_logs 確認 auzistephanie@gmail.com 真實登入正常 |
| §6 Phase 3（App 四大 module） | ✅ 已完成（2026-07-30）——`app.html`＋`js/db.js`/`photos.js`/`content.js`＋`css/shared.css`；2026-09-13 由 Supabase edge_logs 確認真 CRUD（project／rooms／quotes／stages／photos）已經喺 production 正常跑緊 |
| §6 Phase 4（Landing page） | ✅ 已完成（2026-07-30）——`landing.html`＋`js/content.js` 加咗 `DICT`＋`css/shared.css` 加咗 landing 專屬 class；375px Playwright 實測冇爆版、兩個計算器 input→output 同 `index.html` 一致、0 console error；Lighthouse mobile 全部 category ≥90（見 CHANGELOG） |
| §6 Phase 5（Deploy Vercel） | ✅ 已完成（2026-07-30）——live 喺 **https://make-my-home-xi.vercel.app**，smoke test 過（0 console error，375px 冇爆版，root rewrite正常） |
| Task 1 刪除 project＋Task 2「法律＋財務」module | ✅ 已完成（2026-09-13，見 CHANGELOG）——刪除 project 改用打名確認 modal；新 tab「法律財務」（律師／按揭），新 table `reno_legal_finance_records` 已跑落 Supabase；按揭仲加咗物業總值/首期%/回贈% 自動計算 |
| Task 3 總支出總覽 | ✅ 已完成（2026-09-13，見 CHANGELOG）——3a audit 確認 schema 冇法分已付/待付，Stephanie 揀咗「只做總支出承諾」；新 tab「總支出」淨計已落實金額，冇改 schema |

## 下一步

Google OAuth＋URL allowlist 都做咗，真實登入＋CRUD 已經喺 production 確認正常。仲未做嘅：spec §8 DoD 嗰條「兩個唔同 Google 戶口互相見唔到對方資料」RLS 隔離測試。

⚠️ **注意**：呢個 Supabase project 同 Travel App 共用。supabase-js v2 用 Navigator Locks 跨分頁序列化 session refresh——同時開好多個分頁（尤其兩個 app 一齊開）會令個 lock 卡死，之後任何分頁嘅 DB 操作都可能永遠 hang 住冇反應冇錯誤（2026-09-13 遇到過，見 CHANGELOG「撳加入按揭記錄冇反應」）。已加 15 秒 timeout 令錯誤唔會再靜靜地卡死，但治本方法係唔好同時開太多分頁，撞到就關晒啲分頁再開新嘅。

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
