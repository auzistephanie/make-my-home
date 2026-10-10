-- 007: child-table writes must also own the parent row (2026-10-11).
--
-- Before: insert/update policies only checked `auth.uid() = user_id`, so a signed-in
-- user could attach their OWN rows (rooms, quotes, stages, photos…) under someone
-- else's project/stage/room. No data leaked (select stays owner-only), but it let
-- junk rows hang off another household's records. Found by the RLS isolation test
-- (see CHANGELOG 2026-10-11).
--
-- After: insert and update both require the parent row to belong to the caller.
-- The update policy gets an explicit WITH CHECK so a row can't be moved under
-- another user's parent either. Select/delete policies are unchanged.
-- Existing data was checked first: 0 child rows owned by a different user than
-- their parent.

-- reno_rooms → reno_projects
drop policy reno_rooms_insert on reno_rooms;
drop policy reno_rooms_update on reno_rooms;
create policy reno_rooms_insert on reno_rooms for insert
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy reno_rooms_update on reno_rooms for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));

-- reno_quotes → reno_projects
drop policy reno_quotes_insert on reno_quotes;
drop policy reno_quotes_update on reno_quotes;
create policy reno_quotes_insert on reno_quotes for insert
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy reno_quotes_update on reno_quotes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));

-- reno_stages → reno_projects
drop policy reno_stages_insert on reno_stages;
drop policy reno_stages_update on reno_stages;
create policy reno_stages_insert on reno_stages for insert
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy reno_stages_update on reno_stages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));

-- reno_legal_finance_records → reno_projects
drop policy reno_legal_finance_records_insert on reno_legal_finance_records;
drop policy reno_legal_finance_records_update on reno_legal_finance_records;
create policy reno_legal_finance_records_insert on reno_legal_finance_records for insert
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy reno_legal_finance_records_update on reno_legal_finance_records for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id
    and exists (select 1 from reno_projects p where p.id = project_id and p.user_id = auth.uid()));

-- reno_photos → reno_stages
drop policy reno_photos_insert on reno_photos;
drop policy reno_photos_update on reno_photos;
create policy reno_photos_insert on reno_photos for insert
  with check (auth.uid() = user_id
    and exists (select 1 from reno_stages s where s.id = stage_id and s.user_id = auth.uid()));
create policy reno_photos_update on reno_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id
    and exists (select 1 from reno_stages s where s.id = stage_id and s.user_id = auth.uid()));

-- reno_room_photos → reno_rooms
drop policy reno_room_photos_insert on reno_room_photos;
drop policy reno_room_photos_update on reno_room_photos;
create policy reno_room_photos_insert on reno_room_photos for insert
  with check (auth.uid() = user_id
    and exists (select 1 from reno_rooms r where r.id = room_id and r.user_id = auth.uid()));
create policy reno_room_photos_update on reno_room_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id
    and exists (select 1 from reno_rooms r where r.id = room_id and r.user_id = auth.uid()));
