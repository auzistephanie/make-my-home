# MakeMyHome / 裝修無伏

> 香港裝修新手嘅全程管家：要預幾耐（工期）、點同設計師傾（需求書＋報價比較）、點樣驗收（分段 checklist＋相片記錄）。廣東話 UI。
> 詳細 build spec（架構、schema、phase 拆解）→ `CLAUDE_BUILD_SPEC.md`，開工前一定要睇。

## 現況（2026-07-12）

| 檔案 | 狀態 |
|---|---|
| `index.html` | 靜態版已完成＋Playwright 驗證通過 — 工期/預算計算器、裝修旅程、設計師溝通指南、驗收清單、伏位警示、術語字典，全部免登入 |
| `preview.html` | UI mockup（假數據）— Landing／登入／Dashboard／需求+電掣／報價比較／施工驗收 六個屏幕，畀 Stephanie 睇過＋批准 |
| `CLAUDE_BUILD_SPEC.md` | 升級版正式 build spec，畀 Claude Code CLI 跟住逐 phase 起（Supabase + Vercel，Gmail 登入） | 未開工 |

## 下一步

跟 `CLAUDE_BUILD_SPEC.md` §6 嘅 5 個 phase 順序起：Supabase schema → Auth → App 四大 module → Landing page（brand-landing-page skill）→ Deploy。每個 phase 完成要 verify 先落下一個。

## 已鎖定嘅產品決定（唔好重新問）

- Stack：單頁 vanilla JS + Supabase（Auth/DB/Storage）+ Vercel
- 登入分界：計算器/教學內容免登入；報價比較／需求規劃／驗收記錄要 Gmail 登入
- 電掣規劃：逐間房問卷（唔做平面圖拖拉）
- 報價比較：公司卡片＋大類金額＋10 條紅旗 checklist（唔做 AI 解析，留 Phase 2）
- 驗收相片：綁工序 stage 層，可加備註
- 名：廣東話主牌「裝修無伏」＋英文副牌 MakeMyHome

完整清單同理由 → `CLAUDE_BUILD_SPEC.md` §1。

## Git / Auto-push

呢個 project 已經接入 Stephanie 現有嘅 auto-push 機制：

- Repo：`https://github.com/auzistephanie/make-my-home.git`
- `.env`（GITHUB_TOKEN，gitignored）／`scripts/github_push.py`／`.gitignore` 已裝好，同 `fable-prompt` 等其他 repo 同一套
- 已加入 `~/Desktop/Stephanie-Google Drive/dev/stephanie-personal/scripts/autopush-registry.txt`，會俾 launchd daemon 或 `push-now.command` 一齊 push，唔使手動 `git push`
- 手動即刻 push：雙擊 `push-now.command`（喺 stephanie-personal/scripts/）或者本 repo 直接跑 `python3 scripts/github_push.py "commit message"`

## Project 存放位置

`~/Desktop/Stephanie-Google Drive/dev/MakeMyHome/`（Stephanie 所有新 project 嘅固定存放規則）
