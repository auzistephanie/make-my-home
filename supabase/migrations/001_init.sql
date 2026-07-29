-- MakeMyHome (裝修無伏) — Phase 1 schema
-- Shared Supabase project (cmtubaxlniglklmdwlzs) also hosts Travel App / daily-novel /
-- sales-trainer / AI老友記 tables — table names prefixed reno_ to avoid collision,
-- following the existing convention (novel_, coach_, elder_).

create table reno_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  flat_type text,
  size_sqft int,
  scope text,
  start_date date,
  budget_cap int,
  created_at timestamptz default now()
);

create table reno_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references reno_projects(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  sort int default 0,
  answers jsonb default '{}'
);

create table reno_quotes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references reno_projects(id) on delete cascade,
  user_id uuid not null,
  company text not null,
  total int,
  breakdown jsonb default '{}',
  flags jsonb default '{}',
  score int,
  status text default 'pending',
  file_path text
);

create table reno_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references reno_projects(id) on delete cascade,
  user_id uuid not null,
  key text not null,
  started_on date,
  finished_on date,
  inspected_on date,
  checklist jsonb default '{}',
  note text,
  unique(project_id, key)
);

create table reno_photos (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references reno_stages(id) on delete cascade,
  user_id uuid not null,
  path text not null,
  caption text,
  created_at timestamptz default now()
);

alter table reno_projects enable row level security;
alter table reno_rooms enable row level security;
alter table reno_quotes enable row level security;
alter table reno_stages enable row level security;
alter table reno_photos enable row level security;

create policy reno_projects_select on reno_projects for select using (auth.uid() = user_id);
create policy reno_projects_insert on reno_projects for insert with check (auth.uid() = user_id);
create policy reno_projects_update on reno_projects for update using (auth.uid() = user_id);
create policy reno_projects_delete on reno_projects for delete using (auth.uid() = user_id);

create policy reno_rooms_select on reno_rooms for select using (auth.uid() = user_id);
create policy reno_rooms_insert on reno_rooms for insert with check (auth.uid() = user_id);
create policy reno_rooms_update on reno_rooms for update using (auth.uid() = user_id);
create policy reno_rooms_delete on reno_rooms for delete using (auth.uid() = user_id);

create policy reno_quotes_select on reno_quotes for select using (auth.uid() = user_id);
create policy reno_quotes_insert on reno_quotes for insert with check (auth.uid() = user_id);
create policy reno_quotes_update on reno_quotes for update using (auth.uid() = user_id);
create policy reno_quotes_delete on reno_quotes for delete using (auth.uid() = user_id);

create policy reno_stages_select on reno_stages for select using (auth.uid() = user_id);
create policy reno_stages_insert on reno_stages for insert with check (auth.uid() = user_id);
create policy reno_stages_update on reno_stages for update using (auth.uid() = user_id);
create policy reno_stages_delete on reno_stages for delete using (auth.uid() = user_id);

create policy reno_photos_select on reno_photos for select using (auth.uid() = user_id);
create policy reno_photos_insert on reno_photos for insert with check (auth.uid() = user_id);
create policy reno_photos_update on reno_photos for update using (auth.uid() = user_id);
create policy reno_photos_delete on reno_photos for delete using (auth.uid() = user_id);

-- Storage bucket for reno photos + quote files, private, owner-prefix only.
insert into storage.buckets (id, name, public)
values ('reno-photos', 'reno-photos', false)
on conflict (id) do nothing;

create policy reno_photos_storage_select on storage.objects for select
  using (bucket_id = 'reno-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy reno_photos_storage_insert on storage.objects for insert
  with check (bucket_id = 'reno-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy reno_photos_storage_update on storage.objects for update
  using (bucket_id = 'reno-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy reno_photos_storage_delete on storage.objects for delete
  using (bucket_id = 'reno-photos' and (storage.foldername(name))[1] = auth.uid()::text);
