-- MakeMyHome (裝修無伏) — 設計＋平面圖（每間房獨立）
-- 平面圖：一張圖 + 校準比例尺 + 一組度尺線（起止點用 0-1 normalized 座標，
-- 相對返 image naturalWidth/naturalHeight，唔受畫面顯示大小影響）。
-- 設計參考相：獨立一個 gallery，純粹儲相，唔涉及度尺，跟 reno_photos
-- 嘅樣式做一張新表（reno_photos 綁 stage，呢個要綁 room）。

alter table reno_rooms
  add column floor_plan_path text,
  add column floor_plan_scale numeric,
  add column floor_plan_measurements jsonb default '[]';

create table reno_room_photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references reno_rooms(id) on delete cascade,
  user_id uuid not null,
  path text not null,
  caption text,
  created_at timestamptz default now()
);

alter table reno_room_photos enable row level security;

create policy reno_room_photos_select on reno_room_photos for select using (auth.uid() = user_id);
create policy reno_room_photos_insert on reno_room_photos for insert with check (auth.uid() = user_id);
create policy reno_room_photos_update on reno_room_photos for update using (auth.uid() = user_id);
create policy reno_room_photos_delete on reno_room_photos for delete using (auth.uid() = user_id);
