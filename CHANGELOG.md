# CHANGELOG — MakeMyHome（裝修無伏）

> 改動記錄出口：新條目一律插喺呢個檔案頂部。CLAUDE.md 只放路由同現行規則。

- 2026-09-13（三度追加）：修「嚟緊期限」卡淨係按開工日倒數、唔理實際進度嘅問題——已簽約嘅用家仲會見到「收齊最少 3 份報價」「揀定公司及核對合約」嘅提醒，明明兩樣都做咗。`dashboardDeadlines()` 加返 `doneFlags`（roomsDone/quotesDone/contractDone，跟現有 routeSteps 完成判斷一致），已完成嘅階段唔會再顯示提醒；全部提醒都完成咗會顯示「準備階段嘅提醒已經冚晒」，唔會再誤導成「未設開工日期」。冇改 database。已用假資料驗證咗簽約後只剩房間需求提醒、同全部完成後嘅空狀態文案，0 console error。

- 2026-09-13（再追加）：揀公司報價比較大類金額加返「訂造傢俬」獨立一項（`BREAKDOWN_CATS` 新增 `furniture`），原本淨係「木工」一項冚晒訂造傢俬同一般木工，兩者報價通常唔同水平，分開先啱比較。`breakdown` 係 jsonb，純加欄位，冇改 schema、冇影響現有報價資料。375px 驗證咗新增報價表單同大類金額對比表都正確顯示，0 console error。

- 2026-09-14：修「平面圖度尺淨係撳到第一個點，第二個點撳唔到」——`<img id="floorPlanImg">` 冇設 `touch-action`，手機瀏覽器好可能將快速兩下 tap 當成「double-tap 縮放」手勢，吞咗第二下嘅 click event（呢個係好經典嘅 mobile web quirk）。之前用合成 `MouseEvent('click', ...)` 做嘅本機測試完全影唔到呢類真實觸控手勢問題，所以之前驗證漏咗。加咗 `touch-action:manipulation`（停用 double-tap 縮放同 300ms tap 延遲，但保留正常滑動）＋`-webkit-user-select:none`／`-webkit-touch-callout:none`（防止長按彈出 iOS「儲存圖片」選單打斷度尺）。冇改 database、冇改度尺邏輯。

- 2026-09-13（七度追加）：新功能「設計＋平面圖」（每間房獨立）。Stephanie 要求「先睇 preview 先起」，用 Claude Design 砌咗兩個方案畀佢揀（方案 A：相片＋手動尺寸表；方案 B：相片上面直接度尺，撳兩下畫線、第一條線校準比例尺、之後嘅線自動計），揀咗方案 B，仲要求平面圖同設計參考相都要分開每間房自己一份（唔係成層樓一個 pool）。

  Schema：`reno_rooms` 加 `floor_plan_path`／`floor_plan_scale`／`floor_plan_measurements`（jsonb 度尺線陣列）／`floor_plan_width`／`floor_plan_height`；新表 `reno_room_photos`（純相片 gallery，唔涉及度尺，RLS 同 `reno_legal_finance_records` 一樣 owner-only）。

  度尺做法：起止點存做 0–1 normalized 座標（相對平面圖原圖 naturalWidth/Height，唔受畫面顯示大小影響）；第一條線要求輸入實際長度校準比例尺（米/像素），之後畫嘅線自動用嗰個 scale 計出米數；SVG overlay 用 viewBox 對齊原圖尺寸畫度尺線＋標籤；delete 校準線會連埋 scale 同全部度尺一齊清（因為之後嘅線都靠嗰條線嘅 scale 計，冇咗校準線個 scale 就唔再有意義）。UI 加喺 #/needs 底下第三個 view（同「房間問卷」「需求書」平排嘅新掣「📐 設計＋平面圖」），沿用房間 tabs 切換。

  本機驗證咗（stub 環境）：冇平面圖嘅上載提示、上載後兩點畫線觸發校準、確認校準後 scale／第一條線正確計算並儲存、之後嘅線用返個 scale 自動計出正確米數、刪除校準線正確清埋 scale 同全部線、設計參考相上載/顯示/刪除都正常，0 code-level console error（得返舊 test session 遺留嘅 stale log 同一個外部 placeholder 圖網絡失敗，同呢個功能本身無關）。

- 2026-09-13（六度追加）：兩個修正。①完成房間問卷之後改去 #/dashboard／下一間房，Stephanie 話直接去「需求書」畫面更有用（呢個先係成個 wizard 嘅實際產出）——已改做撳「完成」即刻切去 `state.needsView = 'summary'`，留喺 #/needs 顯示需求書＋掣位清單。②**全屋掣位清單漏晒燈掣**——wizard 第 4 步一路有問主燈單控/雙控、調光掣、特別燈光需求，但掣位清單淨係讀 `answers.sockets`，燈光資料完全冇顯示，等於俾電工睇嗰張清單漏走晒燈掣位置。加咗 `lightingSwitchRows()`，將主燈開關（跟單控/雙控自動計 1 或 2 個位）、調光掣、特別燈光需求都變成同插座一樣嘅列，`renderNeedsSummary`（HTML 表）同 `generateSocketListText`（.txt 匯出）都同步顯示；標題改做「全屋掣位＋燈掣清單」。冇改 database；本機驗證咗 HTML 表同文字匯出都正確顯示燈掣列，0 console error。

- 2026-09-13（五度追加）：房間需求問卷三個修正。①**用途／傢俬冇因應房型自動建議**——揀「廚房」呢啲常見房型之後，第 1 步「主要用途」仲係要由零打字，「大型傢俬」都淨係得自由輸入，冇建議。加咗 `ROOM_USAGE_SUGGESTIONS`／`ROOM_FURNITURE_SUGGESTIONS`：已知房型（客飯廳/主人房/細房/廚房/浴室）會自動填低常見用途（可以自己改），傢俬field 下面加返可以撳嘅建議 chip（似步驟 2 儲物類型嗰啲），撳一下就會加/減入去個文字field，唔使成隻字打。②**電掣插座清單全屋用同一份，廚房都問「床頭插座」**——`SOCKET_TYPES` 之前係成個 app 淨係得一份，同房型完全冇關，廚房/浴室都會問啲完全用唔到嘅插座類型。加咗 `ROOM_SOCKET_TYPES`（廚房：雪櫃/爐具/檯面/洗衣機插座；浴室：風筒/洗衣機/熱水爐；客飯廳：電視/冷氣/網絡/一般插座），未知房名 fallback 用返原本嗰份（啱做臥室/書房）。改埋掣位清單生成（`renderNeedsSummary`／`generateSocketListText`）同儲存邏輯都跟返房型讀寫正確嘅 key，唔會漏走資料。③**行完 4 步撳「完成」淨係留喺同一個畫面，冇任何後續**——而家會提示邊間房搞掂咗，自動跳去下一間未完成嘅房繼續（如果有），全部房都做晒就帶去 Dashboard，唔會再撳完完成掣都唔知做咩。冇改 database；本機驗證咗三個修正（廚房用途/傢俬建議、廚房/浴室/客飯廳插座清單、單房/多房完成後跳轉），0 console error。

- 2026-09-13（四度追加）：三個修正。①**timeout guard 擴到全部 db.js function**——之前淨係包住法律財務 module 嘅 call，但同一個「跨分頁 session lock 卡死」風險其實影響全部 Supabase 呼叫；今次 Stephanie 喺房間需求問卷撳「下一步」都撞到一樣嘅「冇反應」，證實風險係系統性。改法：`withTimeout()` 移咗入 `js/db.js` 內部，包住每一個 function（projects/rooms/quotes/stages/photos/legal_finance 全部），app.html 唔使逐個 call site 記得包，日後新功能自動有保障；順手拆走 app.html 入面變成多餘嘅重複 wrapper。②房間問卷「下一步」掣加返 loading spinner——之前撳完完全冇任何視覺反應（唔似報價/法律財務嗰啲掣有轉圈），家陣會 disable＋轉圈，出錯會清楚彈返 toast 並且掣可以再撳。③**加房間嘅建議 chip 之前得第一間房先有**——加完客飯廳之後，撳「＋」淨係得返一個原生 `prompt()`，冇任何建議、風格都同成個 app 唔夾；抽咗個 `roomPickerHtml()` 出嚟共用，而家加第 2/3/4 間房都有常見房間 chip（自動剔走已經加咗嘅），撳「＋」變成同一個 app 內置面板，唔再彈原生 prompt。附帶執咗「準備階段嘅提醒已經冚晒」呢句拗口嘅字眼，改做「裝修前嘅準備工夫都做晒，安心跟進施工同驗收」。冇改 database。本機驗證咗 3 個修正，0 console error。

- 2026-09-13（追加）：修「撳加入按揭記錄冇反應」——根因唔喺 app code，係 supabase-js v2 用 Navigator Locks 跨分頁序列化 session refresh；Stephanie 今日開咗好多個分頁（MakeMyHome＋共用同一個 Supabase 專案嘅 Travel App），舊分頁卡住個 lock 冇放，之後任何一個分頁嘅 DB 呼叫都可以永遠 hang 住——冇 network request、冇錯誤、UI 淨係停喺 loading spinner。喺 production 用一個新分頁＋一個舊（污染咗）分頁分別重現咗：新分頁 3 秒內正常收到 RLS 拒絕嘅錯誤 toast，舊分頁 3 秒後仲係完全冇反應。修法：加 `withTimeout()` helper，包住法律財務 module 嘅 create/update/delete 三個 call，15 秒後逾時會彈返一個講明「可能係開得太耐嘅分頁卡住 session，關晒啲分頁再試」嘅錯誤 toast，唔會再永遠卡住冇反應。即時解法：Stephanie 要關晒 make-my-home 同 travel app 嘅所有分頁，開返新嘅先再試。

- 2026-09-13（再下半）：按揭記錄自動計算。加 3 個新欄位（`property_price`／`down_payment_pct`／`cash_rebate_pct`）：物業總值＋首期% 自動計貸款額，貸款額＋利率＋年期自動計每月供款／累計已付利息，貸款額＋回贈% 自動計現金回贈金額——全部可以自己覆蓋，覆蓋咗就唔會再自動更新，撳「重新自動計算」攞返建議值（用固定利率年金公式，僅供參考，銀行實際首兩年利率同之後通常唔同）。移除按揭 sub-tab 嘅「報價（$）」（律師 sub-tab 保留），改用物業總值。按揭狀態改做「申請中／已批核／已落實／完成」，律師狀態不變（已聯絡／報價中／已落實／完成）；Task 3b 總支出總覽嘅按揭分項相應改用「累計雜費－現金回贈」嘅淨支出（貸款額本身係借嚟嘅錢，唔係裝修支出）。375px 驗證咗物業總值/首期→貸款額、貸款額→每月供款/利息、貸款額→回贈 三條自動計算鏈，同覆蓋後唔會被打亂嘅行為，0 console error。

- 2026-09-13（下半）：Task 3b——新獨立 tab「總支出」，跨 module 加總「已落實」金額：裝修工程取已簽主合約總額＋已選定額外工程報價（冇主合約就 fallback 去加總已標記「已簽約」嘅報價），律師／按揭各自加總 `reno_legal_finance_records` 入面 `status` 屬於「已落實」或「完成」嘅 `quote_amount`。跟 3a audit 結果同 Stephanie 確認：schema 冇欄位可以準確分「已付」同「待付」，所以呢版只做單一「已落實總支出承諾」數字＋按 module 分項，冇改 schema、冇勉強砌一個唔準嘅已付/待付分類。假 session/DB stub 375px 驗證過有合約／冇合約兩條路徑，數字加總啱，0 console error。

- 2026-09-13：Task 1＋2（`claude/review-70pct-2026-09-13.md` 後續）。**刪除 project**：原有「刪除 project」掣改用打返個 project 名先解鎖「確認刪除」嘅 modal（防手震），取代原本嘅瀏覽器 `confirm()`；核實 `reno_rooms`/`reno_quotes`/`reno_stages` 早已對 `reno_projects` 設咗 `on delete cascade`（`reno_photos` 對 `reno_stages` 亦然），刪 project 冇孤兒 row，今次冇改呢部分 schema。**新 module「法律＋財務」**：新 table `reno_legal_finance_records`（`project_id on delete cascade`＋owner-only RLS 四條 policy，已用 Supabase MCP 直接跑落 `cmtubaxlniglklmdwlzs`，見 `supabase/migrations/002_legal_finance.sql`），app.html 加第五個 tab「法律財務」，律師／按揭兩個 sub-tab，卡片式 CRUD 跟現有四大 module 風格；`js/db.js` 加 `listLegalFinanceRecords`/`createLegalFinanceRecord`/`updateLegalFinanceRecord`/`deleteLegalFinanceRecord`。用假 session／假 DB stub 喺 375px 本機驗證咗 tab 排版、新增/編輯表單、刪除 modal 解鎖邏輯，0 console error；真實 Google 登入＋RLS 隔離驗證仍然卡喺 CLAUDE.md 講嘅 OAuth 人手步驟未做。**Task 3a（總支出總覽 schema audit）已完成，貼咗畀 Stephanie 確認**，未經確認前未郁 Task 3b。

- 2026-09-11：改善首次開始施工流程——施工頁優先顯示「今日先做呢一步」及當前工序，說明整體預計開工日與工序實際開工／完成／驗收日期分工；Dashboard 會依次提示施工中、待驗收及下一工序，只有七個工序全部完成及驗收先顯示整體完成。日期輸入加入開工 → 完成 → 驗收次序檢查。保留七工序、責任來源、checklist、相片、備註及原有 database schema。

- 2026-09-09：修正責任交接完成後 Dashboard 下一步倒退問需求或報價嘅問題——一旦七個工序責任已確認，首頁就優先帶用家準備第一個施工工序或繼續當前工序，路線圖同步將「施工＋分段驗收」標示為「而家」；保留原有 60% 完成進度計法，沒有改 database、責任資料或 onboarding 設定。

- 2026-09-08：修正額外工程預算——「目前已確認預算」只計主合約及現行主合約外工程已選定負責公司嘅報價，未獲選或已不再屬漏項嘅候選報價保留比較但不計入；責任已落實後，新增報價按鈕改稱「加入候選報價」，避免誤示仍有漏項。沿用 `_responsibility_selected`，冇改 database。

- 2026-09-06：修正責任交接狀態文案——主合約外工程一旦揀定負責公司，上方改顯示「合約範圍責任已落實」，未落實數量只計真正未有負責公司或仍要問清楚嘅項目；責任清單、Dashboard 同七工序沿用同一套 `responsibilityPlan()` 判斷，冇改 database。

## 2026-08-31 — 主合約／額外報價交接成七工序責任清單（本地，未部署）

- 合約七大工程新增「負責公司」交接：主合約已包括項目自動歸主承辦商；漏項有多份額外報價時，由用家揀定最後採用邊間，尚未問清楚／未揀公司會保持未落實。
- 加入開工前責任清單，逐項顯示工程、負責公司、主合約／額外報價來源，以及對應施工工序；七項全部落實後先可確認交接，但施工頁一直可以預覽。
- 七個施工工序卡新增負責公司及責任來源，沿用既有開工／完成／驗收日期、checklist、相片及備註；明確將合約 `install` 對應施工 `fit`，避免靠名稱猜測。
- 沿用 `reno_quotes.flags` 儲存 `_responsibility_selected`／`_handoff_confirmed`，冇 database migration；今次只整合上一階段本地改動並修改 `app.html`、`css/shared.css`、`CHANGELOG.md`，未 push、未部署。

## 2026-08-30 — 合約缺口由提示升級做逐項行動中心

- 已簽合約摘要新增「要另報價／要問清楚／已包括」三個數量，未落實項目分成問清楚及補報價兩段，避免用家睇完漏項仍然唔知下一步。
- 七大工程各有針對性確認問法，可一鍵複製；「記錄答案」會直接帶返合約範圍欄位更新結果，冇新增 database 欄位。
- 每個不包括項目可以直接開對應報價表格並預選漏項；畫面顯示已有幾間報價、距離三間比較仲差幾多。Dashboard 同步分開顯示待問及另報價數量。
- 原有七大工程清單保留喺可展開詳情，主畫面優先顯示行動；沿用現有 `reno_quotes.flags._contract_scope`／`_quote_for`，冇 database migration、冇部署。

## 2026-08-30 — 已簽約用家改行合約漏項流程

- 修正 onboarding 揀「準備開工／已簽約」後仍然要求比較報價嘅 stage mapping bug：Dashboard 下一步改為「加入已簽合約」；揀「施工中」但未補合約亦會提示補記合約，而唔係倒退去比較主報價。
- 新增已簽合約表格：公司、合約總額、開工／預計完工日、合約檔案；七大工程範圍逐項揀「已包括／不包括要另行報價／唔確定要問清楚」。沿用 `reno_quotes.flags` JSON 儲存 `_kind`、`_contract_scope`、`_contract_end_date`，冇 database migration。
- 合約摘要會分開列出「要另行報價」同「要問清楚」；有漏項就提供「為漏項加入報價」，額外報價可標明處理邊個漏項，並顯示主合約＋額外報價暫計總額。
- Dashboard 裝修路線會按 onboarding 階段略過已完成嘅報價階段；合約仍有漏項時，優先提示處理漏項，避免直接當成可以開工。已簽約階段嘅開工倒數亦改為提醒加入合約同確認漏項，唔再叫用家比較主報價。

## 2026-08-30 — 修正 Google 登入錯誤跳去 Travel App

- 根因：MakeMyHome、Travel App 等共用同一個 Supabase project；Auth `Site URL` 係 Travel App，而 redirect allowlist 冇 MakeMyHome，所以 Google OAuth 完成後將 MakeMyHome callback 當成不允許網址，fallback 去 Travel App。
- 修正：Supabase Authentication → URL Configuration 新增 `https://make-my-home-xi.vercel.app/**`；保留原有 Site URL 同其餘 4 條 redirect URL，冇影響 Travel App／其他 app。
- 真實 browser 驗證：由 `https://make-my-home-xi.vercel.app/app#/login` 撳「用 Google 帳戶繼續」完成 Google OAuth，callback 返回 MakeMyHome `/app`，route 進入 `#/dashboard`，並顯示新版「30 秒設定」第一步；冇再跳去 Travel App。

## 2026-08-29 — 新版 Dashboard＋首次使用流程

- 新用家第一次登入、未有 project 時，改行 3 步 onboarding：目前裝修階段 → 單位基本資料 → 最想解決嘅事；完成後先建立 project，唔再一入 app 就直接面對普通資料表格。
- Dashboard 由四張功能狀態卡改成行動主導首頁：顯示「而家最應該做」、按資料計算整體進度、五步裝修路線、由開工日倒數嘅三個期限，同埋時間風險提醒。首次設定揀咗「比較報價／準備開工／施工中」時，下一步亦會優先帶去相應 module。
- 底部導航統一為「今日／規劃／揀公司／施工」；報價卡原本容易誤解嘅「風險評分」改名做「報價安全度」（高分代表較安全）。
- 今次只改 `app.html`、`css/shared.css` 同本記錄；冇改 database schema、Supabase migration、RLS、既有 CRUD 或 landing page。

- 2026-08-01（承 07-31 制度複檢）：**`scripts/github_push.py` 修靜默故障** — 舊版 `_PUSH_STATE_DIR` 用 `os.path.dirname(REPO)` 當 stephanie-personal 係隔籬 folder；04-MAINTENANCE §6 將 5 個 repo 搬出 Drive Mirror 後假設崩咗，`makedirs` 靜靜咁喺 `~/Desktop/dev`、`~/dev`、`daily-novel/` 開咗 3 個假 stephanie-personal，concurrent-push 偵測對 6 個 repo 死咗都冇人知（真 state 檔停留喺 7/26–7/30）。改為 `STEPHANIE_PERSONAL_DIR` 環境變數 → Drive 正本絕對路徑 → legacy sibling 三段 resolve，搵唔到就**唔寫兼出聲**（S5「死咗邊個會知」）。12 份 script 一齊改，py_compile 全過，sales-trainer 實跑驗證真 state 有更新。假 folder 已收入 `_to_delete/`。

- 2026-07-31：`.gitignore` 加 `*.bak-*` 第二道防線 — 配合 06-STANDARDS §S3「備份一律開喺 `_to_delete/`」，就算漏咗 mv 都唔會畀 `github_push.py` 誤推上 GitHub（2026-07-25 事故嘅根治）。本 repo 冇 governance `backups/`，所以唔需要 negation 例外。

## 2026-07-30 Phase 5 — Deploy 完成，live 咗

- Stephanie 批准喺 `~/.claude/settings.json` 加 `Bash(vercel:*)` permission 之後，用佢已登入嘅 Vercel CLI（同其他 12 個已上線 project 共用戶口）跑 `vercel --prod --yes --name make-my-home` 部署成功。
- Production URL：**https://make-my-home-xi.vercel.app**（project：`auzistephanies-projects/make-my-home`）。
- Smoke test（真實 live URL，唔係本地）：`/` 200＋title「裝修無伏 — 香港裝修新手指南」（`vercel.json` root rewrite去 `landing.html` 生效）；`/app` 200＋title「裝修無伏 — MakeMyHome」；`/app.html`／`/landing.html` 各 308 redirect去無副檔名版（`cleanUrls:true` 預期行為，唔係錯）；375px viewport 兩頁都冇 overflow；Playwright 量到 **0 console/page error**。
- ⚠️ 仲要做（Stephanie）：production domain 出咗（`make-my-home-xi.vercel.app`），要去 [Supabase Auth → URL Configuration](https://supabase.com/dashboard/project/cmtubaxlniglklmdwlzs/auth/url-configuration) 加返 Site URL＋redirect allowlist（spec §7 第3點）——同埋 Phase 2 講嗰個 Google OAuth Console／Provider 設定，兩樣都做完先可以真正登入用。

## 2026-07-30 Phase 4 — `landing.html`（復古花磚 scroll journey）起好

- 起咗 `landing.html`（8 個 scene：hero → 三大痛點 → 工期計算器 → 預算計算器 → 裝修旅程 7 步 → 伏位警示 8 條 → 術語字典 → 儲存計劃 CTA），每 section 一個色調場景（cream/terracotta-tint/green-tint/dark-ink/danger-tint 輪替），沿用 `preview.html` ①Landing 屏幕嘅深綠+花磚 hero 視覺。`js/content.js` 加咗 `DICT`（21 條術語，由 `index.html` 搬字過紙）；工期計算邏輯直接用返 Phase 3 已有嘅 `STAGES`／`scheduleFactor`，冇重複寫一套新嘅（預算計算嘅 `GRADES` 係 landing 專屬，唔搬入 content.js）。`css/shared.css` 加咗一批 landing 專屬＋通用 class（hero-num/gantt/reminder/journey/trap/dict/searchbar/note.warn 等，刻意寫成通用組件，方便日後 app.html 都用得到）。
- **sessionStorage 銜接 app.html**（spec 冇寫呢段點做，屬於呢次任務要補嘅邏輯）：兩個計算器＋最尾 CTA 撳「儲存到我嘅 project →」會將 `calcState`（flat_type/scope/size_sqft/start_date/budget_cap）寫入 `sessionStorage['mmh_landing_payload']`，跳去 `app.html#/login`（已有 session 會由現有 `auth.js` 自動轉 `#/dashboard`）。`app.html` 加咗 `consumeLandingPayload()`，喺 `renderDashboard()` 開頭讀走個 payload（讀完即刪，唔會重複套用），逐個欄位對返 `FLAT_TYPES`/`SCOPES` 驗證先接受，唔信 sessionStorage 嘅內容——冇動 `renderDashboard()` 其餘已驗證過嘅邏輯。
- 驗證：Playwright 真實行過（唔係淨睇 code）——375px viewport `scrollWidth===clientWidth`，冇任何元素闊過 viewport；工期計算器（私樓/450呎/全屋翻新）輸出「約 35–51 日」「5–8 星期」同 index.html 原本公式手算結果一致；預算計算器（450呎/中檔）輸出「$41萬–$63萬」同手算一致；字典搜尋「批盪」揀中 3 條；`t-save`/`b-save`/`cta-save` 三粒掣寫嘅 `calcState` 內容啱；跨 `landing.html`→`app.html` 嘅真實 file:// 導航後 sessionStorage payload 冇跌失，`consumeLandingPayload()` 對垃圾/惡意輸入（`flat_type:'DROP TABLE'`／負數 `budget_cap`／假日期）逐項過濾冇被整段信晒；landing.html 全程 0 console/page error；順手用 Playwright 開返 app.html 確認呢次加嘅 CSS 冇拖冧佢原本 375px 畫面。
- **Lighthouse mobile 真係跑到**（起初以為 sandbox 冇 headless Lighthouse，實試先發現 `npx lighthouse` 可以用）：起本地 `python3 -m http.server` 畀 lighthouse 用 http:// 跑（file:// 唔啱），第一輪 accessibility 得 69（label/select 冇 `for`、冇 `<main>` landmark、favicon 404）；修完（`label for=`＋`id`、`<main>`、`<link rel=icon href="data:,">`、dict 搜尋框加 `.sr-only` label）之後全部 category ≥90：performance 100／accessibility 93／best-practices 100／seo 100。剩低嗰粒 accessibility 扣分係 color-contrast（白字 on `--accent` 4.09:1，差 4.5:1 先夠）——**冇改**，因為 (1) `--accent` 係 spec §2 鎖死嘅 token，(2) `.dict .term b`／`.footer-note` 兩個扣分位係 `index.html` 原本已有嘅同一組合，一齊改就同「靜態內容/文案唔使重寫」原則有衝突，交返 Stephanie 拍板要唔要動個 token。
- ⚠️ **同 spec 有出入嘅位**：`index.html` 嘅裝修旅程第 4 步文案講「伏位警示的 11 大報價陷阱」，但 `traps`/`INSPECT` 相關列表實際只有 8 條（spec §5.1 都寫「伏位警示 8 條」）——跟咗 spec 同實際列表數量（8），`index.html` 嗰句「11 大」係佢自己文案入面嘅舊講法唔啱數，冇跟住抄錯。
- 未做：真實 Google 登入之後嘅 end-to-end 驗證（自動建新 project 嗰段 `createProject` call）——同 Phase 2/3 一樣卡喺 Stephanie 未做嘅 Google Cloud Console／Supabase Dashboard 人手步驟；`consumeLandingPayload()` 純邏輯已喺 app.html 頁面環境入面直接單元測過（sessionStorage 讀寫＋驗證＋一次性消費），但冇跟住行到真登入完成建 project 嗰步。

## 2026-07-30 Phase 3 — `app.html` 四大 module 起好

- 起咗 `app.html`（917 行，hash routing 五個 route）、`js/db.js`（`reno_` 前綴五個表 CRUD）、`js/photos.js`（canvas 壓縮≤300KB/1600px+上載 `reno-photos`）、`js/content.js`（由 `index.html` 抽 STAGES/INSPECT，加 §5.3 十條紅旗權重計分）、`css/shared.css`（§2 design tokens）。
- **順手發現＋補咗一個 Phase 2 遺留 bug**：`js/supabase.js` 原本 `const supabase = window.supabase.createClient(...)` 同 supabase-js UMD bundle 自己嘅頂層 `var supabase` 撞名，跨 `<script>` tag 撞 `SyntaxError`，靜靜整個 app 冧晒（`supabase.auth`/`supabase.from` 全部 undefined）——之前 Phase 2 冇喺瀏覽器實跑過所以冇發現。改用 `window.supabase = window.supabase.createClient(...)` 修正。
- 驗證：真實（冇 mock）測咗 unauthenticated flow——`#/login` 顯示正常、撳 Google 掣真係發到 `auth/v1/authorize` request、冇 session 全部 route 跳返 login，0 console error。已登入畫面用 mock data layer（唔係 mock UI，UI code 100%真）測 375px 冇爆版+4 個 route 交互正常。主 session 亦用 `node --check` 覆核全部 JS 檔案語法+真實 http server 起頁。
- ⚠️ 未測：真 Google 登入之後嘅真實 CRUD（RLS 生效／真實檔案上載／多戶口隔離）——卡喺 Phase 2 講嗰個人手步驟（Stephanie 未做 Google Cloud Console + Supabase Dashboard 嗰兩步）。
- 落地：五個檔案內容用 `reno_` 前綴核對過冇漏（grep 冇搵到任何 unprefixed `projects/rooms/quotes/stages/photos` 表名引用）。

## 2026-07-30 Phase 2 — `js/auth.js` 寫咗，但真正驗證卡喺人手步驟

- 寫咗 `loginWithGoogle()`／`logout()`／`getSession()`／`requireSession()`＋`onAuthStateChange` 自動跳 `#/dashboard`。
- ⚠️ **未算完成**（02-JUDGMENT §R2 第2格「用家路徑驗過」未過）：Supabase Auth 嘅 Google provider 要喺 Dashboard 開，前提係 Google Cloud Console 攞到 OAuth client id/secret——呢兩步 spec §7 已寫明係「人手步驟，Claude Code 做唔到」，MCP 工具冇對應 API 可以查/設 Auth provider 設定，核實過真係冇（搜過 Supabase MCP 全部 tool）。所以真正「登入 redirect 返嚟有 session」呢條驗收，要 Stephanie 做完先可以驗。

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
