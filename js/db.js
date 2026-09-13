// CRUD helpers for the app modules. Uses the `reno_` prefixed tables
// (this Supabase project is shared with 4 other apps — see CLAUDE_BUILD_SPEC.md
// note in CLAUDE.md). Requires js/supabase.js loaded first.
//
// Every function throws on error (caller wraps in try/catch and shows a toast) —
// none of them swallow errors silently.

function dbThrow(action, error) {
  console.error(`[db] ${action} failed:`, error);
  throw new Error(error.message || `${action} 失敗`);
}

// Guards every call below against a stuck cross-tab Supabase auth lock — a
// real supabase-js v2 footgun: it serializes session refresh across
// same-origin tabs (including sibling apps sharing this Supabase project)
// using a browser lock, and a stale/background tab that never released it can
// make every future call hang forever with no request ever firing and no
// error (confirmed 2026-09-13: reproduced on a long-lived tab — the exact
// symptom was "click save, nothing happens, no toast, no network request").
// Wrapping every DB call here — not just the ones a caller remembers to wrap
// — means the whole app degrades to a clear error instead of an infinite
// spinner, no matter which module hits the stuck lock.
const DB_TIMEOUT_MS = 15000;
const DB_STUCK_SESSION_MSG = '請求逾時——可能係開得太耐或太多分頁卡住咗登入 session（尤其係同時開住其他共用呢個 Supabase 專案嘅 app）。請關晒呢個 app 嘅所有分頁，再重新打開試多次。';
function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(DB_STUCK_SESSION_MSG)), DB_TIMEOUT_MS)),
  ]);
}

// ---------------- reno_projects ----------------
async function listProjects(userId) {
  const { data, error } = await withTimeout(supabase
    .from('reno_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true }));
  if (error) dbThrow('listProjects', error);
  return data;
}

async function createProject(userId, fields) {
  const { data, error } = await withTimeout(supabase
    .from('reno_projects')
    .insert({ user_id: userId, ...fields })
    .select()
    .single());
  if (error) dbThrow('createProject', error);
  return data;
}

async function updateProject(id, patch) {
  const { data, error } = await withTimeout(supabase
    .from('reno_projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single());
  if (error) dbThrow('updateProject', error);
  return data;
}

async function deleteProject(id) {
  const { error } = await withTimeout(supabase.from('reno_projects').delete().eq('id', id));
  if (error) dbThrow('deleteProject', error);
}

// ---------------- reno_rooms ----------------
async function listRooms(projectId) {
  const { data, error } = await withTimeout(supabase
    .from('reno_rooms')
    .select('*')
    .eq('project_id', projectId)
    .order('sort', { ascending: true }));
  if (error) dbThrow('listRooms', error);
  return data;
}

async function createRoom(userId, projectId, name, sort) {
  const { data, error } = await withTimeout(supabase
    .from('reno_rooms')
    .insert({ user_id: userId, project_id: projectId, name, sort: sort || 0, answers: {} })
    .select()
    .single());
  if (error) dbThrow('createRoom', error);
  return data;
}

async function updateRoom(id, patch) {
  const { data, error } = await withTimeout(supabase
    .from('reno_rooms')
    .update(patch)
    .eq('id', id)
    .select()
    .single());
  if (error) dbThrow('updateRoom', error);
  return data;
}

async function deleteRoom(id) {
  const { error } = await withTimeout(supabase.from('reno_rooms').delete().eq('id', id));
  if (error) dbThrow('deleteRoom', error);
}

// ---------------- reno_quotes ----------------
async function listQuotes(projectId) {
  const { data, error } = await withTimeout(supabase
    .from('reno_quotes')
    .select('*')
    .eq('project_id', projectId)
    .order('score', { ascending: false, nullsFirst: false }));
  if (error) dbThrow('listQuotes', error);
  return data;
}

async function createQuote(userId, projectId, fields) {
  const { data, error } = await withTimeout(supabase
    .from('reno_quotes')
    .insert({ user_id: userId, project_id: projectId, status: 'pending', ...fields })
    .select()
    .single());
  if (error) dbThrow('createQuote', error);
  return data;
}

async function updateQuote(id, patch) {
  const { data, error } = await withTimeout(supabase
    .from('reno_quotes')
    .update(patch)
    .eq('id', id)
    .select()
    .single());
  if (error) dbThrow('updateQuote', error);
  return data;
}

async function deleteQuote(id) {
  const { error } = await withTimeout(supabase.from('reno_quotes').delete().eq('id', id));
  if (error) dbThrow('deleteQuote', error);
}

// Upload a quote document (pdf/image) to the shared reno-photos bucket, under
// {user_id}/quotes/... per CLAUDE_BUILD_SPEC.md §4. No compression — quotes are
// often PDFs; photos.js's compressor is for camera photos only.
async function uploadQuoteFile(userId, quoteId, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${userId}/quotes/${quoteId}-${Date.now()}.${ext}`;
  const { error } = await withTimeout(supabase.storage.from('reno-photos').upload(path, file, { upsert: true }));
  if (error) dbThrow('uploadQuoteFile', error);
  return path;
}

function quoteFileSignedUrl(path) {
  return supabase.storage.from('reno-photos').createSignedUrl(path, 60 * 60);
}

// ---------------- reno_stages ----------------
// Seven fixed stages per project (STAGES in content.js). Ensures rows exist —
// safe to call every time #/build loads (unique(project_id,key) makes the
// insert a no-op via upsert-on-conflict-ignore semantics).
async function ensureStages(userId, projectId) {
  const { data: existing, error: selErr } = await withTimeout(supabase
    .from('reno_stages')
    .select('key')
    .eq('project_id', projectId));
  if (selErr) dbThrow('ensureStages(select)', selErr);
  const have = new Set((existing || []).map(r => r.key));
  const missing = STAGES.filter(s => !have.has(s.k));
  if (missing.length) {
    const rows = missing.map(s => ({ user_id: userId, project_id: projectId, key: s.k, checklist: {} }));
    const { error: insErr } = await withTimeout(supabase.from('reno_stages').insert(rows));
    if (insErr) dbThrow('ensureStages(insert)', insErr);
  }
  return listStages(projectId);
}

async function listStages(projectId) {
  const { data, error } = await withTimeout(supabase
    .from('reno_stages')
    .select('*')
    .eq('project_id', projectId));
  if (error) dbThrow('listStages', error);
  // Order by STAGES canonical order (DB order isn't guaranteed).
  const order = STAGES.map(s => s.k);
  return (data || []).slice().sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

async function updateStage(id, patch) {
  const { data, error } = await withTimeout(supabase
    .from('reno_stages')
    .update(patch)
    .eq('id', id)
    .select()
    .single());
  if (error) dbThrow('updateStage', error);
  return data;
}

// ---------------- reno_photos ----------------
async function listPhotos(stageId) {
  const { data, error } = await withTimeout(supabase
    .from('reno_photos')
    .select('*')
    .eq('stage_id', stageId)
    .order('created_at', { ascending: true }));
  if (error) dbThrow('listPhotos', error);
  return data;
}

async function createPhotoRecord(userId, stageId, path, caption) {
  const { data, error } = await withTimeout(supabase
    .from('reno_photos')
    .insert({ user_id: userId, stage_id: stageId, path, caption: caption || null })
    .select()
    .single());
  if (error) dbThrow('createPhotoRecord', error);
  return data;
}

async function deletePhoto(id, path) {
  const { error: dbErr } = await withTimeout(supabase.from('reno_photos').delete().eq('id', id));
  if (dbErr) dbThrow('deletePhoto', dbErr);
  if (path) {
    const { error: stErr } = await withTimeout(supabase.storage.from('reno-photos').remove([path]));
    if (stErr) console.error('[db] deletePhoto storage cleanup failed:', stErr); // record already gone; don't block UI on this
  }
}

function photoPublicPath(path) {
  // Bucket is private — build a signed URL for display.
  return supabase.storage.from('reno-photos').createSignedUrl(path, 60 * 60);
}

// Total photo count across a set of stage ids — used by #/dashboard's 驗收記錄 card
// summary so it doesn't need to fetch every photo row just to count them.
async function countPhotosForStages(stageIds) {
  if (!stageIds || !stageIds.length) return 0;
  const { count, error } = await withTimeout(supabase
    .from('reno_photos')
    .select('id', { count: 'exact', head: true })
    .in('stage_id', stageIds));
  if (error) dbThrow('countPhotosForStages', error);
  return count || 0;
}

// ---------------- reno_legal_finance_records ----------------
async function listLegalFinanceRecords(projectId) {
  const { data, error } = await withTimeout(supabase
    .from('reno_legal_finance_records')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true }));
  if (error) dbThrow('listLegalFinanceRecords', error);
  return data;
}

async function createLegalFinanceRecord(userId, projectId, fields) {
  const { data, error } = await withTimeout(supabase
    .from('reno_legal_finance_records')
    .insert({ user_id: userId, project_id: projectId, ...fields })
    .select()
    .single());
  if (error) dbThrow('createLegalFinanceRecord', error);
  return data;
}

async function updateLegalFinanceRecord(id, patch) {
  const { data, error } = await withTimeout(supabase
    .from('reno_legal_finance_records')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single());
  if (error) dbThrow('updateLegalFinanceRecord', error);
  return data;
}

async function deleteLegalFinanceRecord(id) {
  const { error } = await withTimeout(supabase.from('reno_legal_finance_records').delete().eq('id', id));
  if (error) dbThrow('deleteLegalFinanceRecord', error);
}
