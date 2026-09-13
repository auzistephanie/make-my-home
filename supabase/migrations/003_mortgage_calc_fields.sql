-- MakeMyHome (裝修無伏) — 按揭自動計算：年期＋現金回贈
-- 加返呢兩個欄位先計到 monthly_payment/total_interest_paid 嘅年金公式，
-- 現金回贈淨係做淨雜費顯示用，唔影響 reno_legal_finance_records.quote_amount
-- （總支出總覽 Task 3b 用嗰個做加總，冇改）。

alter table reno_legal_finance_records
  add column loan_years int,
  add column cash_rebate numeric;
