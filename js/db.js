// CRUD helpers for the four app modules. Uses the `reno_` prefixed tables
// (this Supabase project is shared with 4 other apps — see CLAUDE_BUILD_SPEC.md
// note in CLAUDE.md). Requires js/supabase.js loaded first.
//
// Every function throws on error (caller wraps in try/catch and shows a toast) —
// none of them swallow errors silently.

function dbThrow(action, error) {
  console.error(`[db] ${action} failed:`, error);
  throw new Error(error.message || `${action} 失敗`);
}

// ---------------- reno_projects ----------------
async function listProjects(userId) {
  const { data, error } = await supabase
    .from('reno_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) dbThrow('listProjects', error);
  return data;
}

async function createProject(userId, fields) {
  const { data, error } = await supabase
    .from('reno_projects')
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
  if (error) dbThrow('createProject', error);
  return data;
}

async function updateProject(id, patch) {
  const { data, error } = await supabase
    .from('reno_projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) dbThrow('updateProject', error);
  return data;
}

async function deleteProject(id) {
  const { error } = await supabase.from('reno_projects').delete().eq('id', id);
  if (error) dbThrow('deleteProject', error);
}

// ---------------- reno_rooms ----------------
async function listRooms(projectId) {
  const { data, error } = await supabase
    .from('reno_rooms')
    .select('*')
    .eq('project_id', projectId)
    .order('sort', { ascending: true });
  if (error) dbThrow('listRooms', error);
  return data;
}

async function createRoom(userId, projectId, name, sort) {
  const { data, error } = await supabase
    .from('reno_rooms')
    .insert({ user_id: userId, project_id: projectId, name, sort: sort || 0, answers: {} })
    .select()
    .single();
  if (error) dbThrow('createRoom', error);
  return data;
}

async function updateRoom(id, patch) {
  const { data, error } = await supabase
    .from('reno_rooms')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) dbThrow('updateRoom', error);
  return data;
}

async function deleteRoom(id) {
  const { error } = await supabase.from('reno_rooms').delete().eq('id', id);
  if (error) dbThrow('deleteRoom', error);
}

// ---------------- reno_quotes ----------------
async function listQuotes(projectId) {
  const { data, error } = await supabase
    .from('reno_quotes')
    .select('*')
    .eq('project_id', projectId)
    .order('score', { ascending: false, nullsFirst: false });
  if (error) dbThrow('listQuotes', error);
  return data;
}

async function createQuote(userId, projectId, fields) {
  const { data, error } = await supabase
    .from('reno_quotes')
    .insert({ user_id: userId, project_id: projectId, status: 'pending', ...fields })
    .select()
    .single();
  if (error) dbThrow('createQuote', error);
  return data;
}

async function updateQuote(id, patch) {
  const { data, error } = await supabase
    .from('reno_quotes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) dbThrow('updateQuote', error);
  return data;
}

async function deleteQuote(id) {
  const { error } = await supabase.from('reno_quotes').delete().eq('id', id);
  if (error) dbThrow('deleteQuote', error);
}

// Upload a quote document (pdf/image) to the shared reno-photos bucket, under
// {user_id}/quotes/... per CLAUDE_BUILD_SPEC.md §4. No compression — quotes are
// often PDFs; photos.js's compressor is for camera photos only.
async function uploadQuoteFile(userId, quoteId, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${userId}/quotes/${quoteId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('reno-photos').upload(path, file, { upsert: true });
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
  const { data: existing, error: selErr } = await supabase
    .from('reno_stages')
    .select('key')
    .eq('project_id', projectId);
  if (selErr) dbThrow('ensureStages(select)', selErr);
  const have = new Set((existing || []).map(r => r.key));
  const missing = STAGES.filter(s => !have.has(s.k));
  if (missing.length) {
    const rows = missing.map(s => ({ user_id: userId, project_id: projectId, key: s.k, checklist: {} }));
    const { error: insErr } = await supabase.from('reno_stages').insert(rows);
    if (insErr) dbThrow('ensureStages(insert)', insErr);
  }
  return listStages(projectId);
}

async function listStages(projectId) {
  const { data, error } = await supabase
    .from('reno_stages')
    .select('*')
    .eq('project_id', projectId);
  if (error) dbThrow('listStages', error);
  // Order by STAGES canonical order (DB order isn't guaranteed).
  const order = STAGES.map(s => s.k);
  return (data || []).slice().sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

async function updateStage(id, patch) {
  const { data, error } = await supabase
    .from('reno_stages')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) dbThrow('updateStage', error);
  return data;
}

// ---------------- reno_photos ----------------
async function listPhotos(stageId) {
  const { data, error } = await supabase
    .from('reno_photos')
    .select('*')
    .eq('stage_id', stageId)
    .order('created_at', { ascending: true });
  if (error) dbThrow('listPhotos', error);
  return data;
}

async function createPhotoRecord(userId, stageId, path, caption) {
  const { data, error } = await supabase
    .from('reno_photos')
    .insert({ user_id: userId, stage_id: stageId, path, caption: caption || null })
    .select()
    .single();
  if (error) dbThrow('createPhotoRecord', error);
  return data;
}

async function deletePhoto(id, path) {
  const { error: dbErr } = await supabase.from('reno_photos').delete().eq('id', id);
  if (dbErr) dbThrow('deletePhoto', dbErr);
  if (path) {
    const { error: stErr } = await supabase.storage.from('reno-photos').remove([path]);
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
  const { count, error } = await supabase
    .from('reno_photos')
    .select('id', { count: 'exact', head: true })
    .in('stage_id', stageIds);
  if (error) dbThrow('countPhotosForStages', error);
  return count || 0;
}
