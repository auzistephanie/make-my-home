-- MakeMyHome (裝修無伏) — 按揭：物業總值/首期%＋現金回贈% 自動計算
-- property_price + down_payment_pct 用嚟自動計 loan_amount（可覆蓋）；
-- cash_rebate_pct 用嚟自動計 cash_rebate（可覆蓋）。quote_amount 呢個 field
-- 對按揭嚟講冇意思，UI 改成只喺律師 sub-tab 先顯示，冇刪 column（歷史資料
-- 唔洗搬）。

alter table reno_legal_finance_records
  add column property_price numeric,
  add column down_payment_pct numeric,
  add column cash_rebate_pct numeric;
