# CHANGELOG — MakeMyHome（裝修無伏）

> 改動記錄出口：新條目一律插喺呢個檔案頂部。CLAUDE.md 只放路由同現行規則。

## 2026-07-30 Phase 1 — Supabase schema + RLS + storage 起好

- 跟 `CLAUDE_BUILD_SPEC.md` §4 起 `reno_projects/reno_rooms/reno_quotes/reno_stages/reno_photos` 五個 table，落喺共用 Supabase project `cmtubaxlniglklmdwlzs`（同 Travel App／daily-novel／sales-trainer／AI老友記 共用）。**表名由 spec 原本嘅 `projects/rooms/quotes/stages/photos` 改做 `reno_` 前綴**——因為呢個 project 係共用嘅，跟現有 `novel_`／`coach_`／`elder_` 命名慣例，避免同其他 app 或未來 table 撞名（spec 寫嗰陣假設係獨立 project，冇診到係共用）。
- 每個 table 四條 RLS policy（select/insert/update/delete，全部 `auth.uid() = user_id`）；`reno-photos` storage bucket（private）+ 四條 owner-prefix policy。
- 驗證：`pg_policies` 查返 20 條 policy 全部掛正確 table／`auth.uid() = user_id`；`get_advisors` security 掃描——冇任何 `reno_*` table 出現喺 missing-policy／RLS-disabled 名單（其餘出現嘅全部係其他 app 舊有 issue，唔關今次事）。冇用真人 auth.users 資料測（讀 `auth.users` 俾 sandbox classifier 擋，屬合理——PII），改用政策定義直接核對達到同等驗證效果。
- 落地：`supabase/migrations/001_init.sql`、`js/supabase.js`（client init，anon publishable key）。
- ⚠️ **順手發現但唔關今次事**：`get_advisors` 報呢個共用 project 有 2 個 pre-existing 問題 —— `public.brain_chunks`／`public.service_heartbeat` 兩個 table RLS 完全冇開（anon key 可以直接讀寫全部 row）。唔喺今次任務範圍，冇自動落 SQL 修，交返 Stephanie 拍板（remediation SQL 已喺 advisor output，需要時再攞）。

## 2026-07-25 `.active-session.lock*` 冇入 .gitignore → session 鎖檔一直推上 GitHub

- **問題**：`session-lock.sh` 喺每個 repo 根寫 `.active-session.lock`；release 嗰陣 Drive mount `rm` 唔到（device bridge 冇 rm 權限），會 fallback 改名做 `.active-session.lock.DELETE-ME-<epoch>`。兩種檔全部 repo 都**冇入 `.gitignore`**，所以 `github_push.py` 照推——最舊一個殘留檔 timestamp 係 **2026-07-14**，即係呢個洩漏行咗成十日。
- **修**：12 個 repo（含 `novel-web`）`.gitignore` 全部加 `.active-session.lock*`（一條 pattern 蓋埋活鎖同 `.DELETE-ME-*`）；現存 16 個殘留檔 mv 入各自 `_to_delete/`。
- **同類第三宗**：同日先修咗 ①`_to_delete/` 冇入 ignore、②`.bak-*` 冇入回收筒，今次係 ③鎖檔。三宗共通根因＝**新產生嘅暫存檔冇人幫佢配 ignore rule**。
- ⚠️ **未做（要 Stephanie 拍板）**：真正治本係改 `session-lock.sh`，唔好將鎖寫入 repo 樹，改寫去 `stephanie-personal/scripts/.session-locks/<repo>.lock` 集中管——咁就冇檔會落 repo，亦唔使靠 12 份 `.gitignore` 各自記得。

## 2026-07-25 `_to_delete/` 冇入 .gitignore → 回收筒檔案推咗上 GitHub（修）

- **問題**：全局規則係「清理檔案一律 mv 去 `_to_delete/`」，但本 repo `.gitignore` 冇 `_to_delete/` 一行。`github_push.py` 嘅 `working_files()` 用 `git ls-files -c -o --exclude-standard`，`--exclude-standard` 只擋 .gitignore 有列嘅嘢——冇列就當普通未追蹤檔照上傳。GitHub Git Trees API 核實 remote `main`：**實際有 1 個（`_to_delete/CLAUDE.md.bak-20260718`）**。
- **修**：`.gitignore` 加 `_to_delete/`。下次 push，`working_files()` 唔再列佢 → `deletions = [p for p in remote if p not in local_set]` 會用 `sha: None` 自動由 remote 樹刪走，唔使（亦唔准）動用 git CLI `rm --cached`。
- **範圍**：同一 session 掃晒 11 個 repo，6 個中招（AI for elderly／stephanie-portfolio／xuanli／catnu-app／MakeMyHome／fable-prompt），一次過全部補。原本已有嘅 5 個：Travel App／daily-novel／sales-trainer／stephanie-personal／venturenix-lab-seminar。
- ⚠️ **只由 HEAD 移除，舊 commit 歷史仍然有**。已 grep 過全部內容，冇 token／secret **值**（只有變數名如 `GITHUB_TOKEN` 出現喺說明文字），本 repo 為 **public**，判斷唔需要 rewrite history。

## 2026-07-18 CLAUDE.md 加 repo 專屬 DoD（開檔呢份 CHANGELOG）

- CLAUDE.md 加「✅ 完成前檢查」section：靜態頁瀏覽器實開行 flow／每 phase 對照 `CLAUDE_BUILD_SPEC.md` §6 驗收標準逐條過／push＋核實 GitHub HEAD（全 repo CLAUDE.md 升級 session，承接同日 Standards 收斂）。改前版本 → `CLAUDE.md.bak-20260718`。
- 本 repo 之前冇 CHANGELOG.md，今日起計。歷史狀態：index.html 靜態版 2026-07-12 完成＋Playwright 驗證；preview.html mockup 已批。
