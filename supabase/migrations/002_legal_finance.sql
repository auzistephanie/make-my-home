-- MakeMyHome (裝修無伏) — Phase 6 Task 2: 法律＋財務 module
-- Same shared Supabase project as 001_init.sql; reno_ prefix kept for the same
-- collision-avoidance reason. project_id cascades so deleting a reno_projects row
-- (Task 1) never leaves orphan legal/finance records, matching the existing
-- reno_rooms/reno_quotes/reno_stages pattern.

create table reno_legal_finance_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references reno_projects(id) on delete cascade,
  user_id uuid not null,
  category text not null check (category in ('lawyer', 'mortgage')),
  contact_name text,
  status text,
  quote_amount numeric,
  notes text,
  -- 淨 category = 'mortgage' 時填
  loan_amount numeric,
  interest_rate numeric,
  monthly_payment numeric,
  total_interest_paid numeric,
  total_fee numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reno_legal_finance_records enable row level security;

create policy reno_legal_finance_records_select on reno_legal_finance_records for select using (auth.uid() = user_id);
create policy reno_legal_finance_records_insert on reno_legal_finance_records for insert with check (auth.uid() = user_id);
create policy reno_legal_finance_records_update on reno_legal_finance_records for update using (auth.uid() = user_id);
create policy reno_legal_finance_records_delete on reno_legal_finance_records for delete using (auth.uid() = user_id);
