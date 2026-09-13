// Canvas compression (≤300KB, longest edge ≤1600px) + Storage upload to the
// `reno-photos` bucket, path `{user_id}/...`. Requires js/supabase.js and
// js/db.js (createPhotoRecord) loaded first.

const PHOTO_MAX_DIM = 1600;
const PHOTO_MAX_BYTES = 300 * 1024;

// Loads a File into an <img>, returns a compressed JPEG Blob that fits both
// constraints (longest edge ≤1600px, size ≤300KB — steps quality down until
// it fits, since a single canvas.toBlob quality pass isn't guaranteed to hit
// a byte target).
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > PHOTO_MAX_DIM || height > PHOTO_MAX_DIM) {
        if (width >= height) {
          height = Math.round(height * (PHOTO_MAX_DIM / width));
          width = PHOTO_MAX_DIM;
        } else {
          width = Math.round(width * (PHOTO_MAX_DIM / height));
          height = PHOTO_MAX_DIM;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const tryQuality = (q) => new Promise(res => canvas.toBlob(res, 'image/jpeg', q));

      (async () => {
        let quality = 0.85;
        let blob = await tryQuality(quality);
        let tries = 0;
        while (blob && blob.size > PHOTO_MAX_BYTES && quality > 0.3 && tries < 8) {
          quality -= 0.1;
          blob = await tryQuality(quality);
          tries++;
        }
        if (!blob) { reject(new Error('相片壓縮失敗')); return; }
        resolve(blob);
      })();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('相片讀取失敗')); };
    img.src = url;
  });
}

// Compresses + uploads one File to reno-photos, then writes the reno_photos row.
// Returns the created row (with a signed URL attached as `.url` for immediate display).
async function uploadPhoto(userId, projectId, stageId, file, caption) {
  const blob = await compressImage(file);
  const path = `${userId}/projects/${projectId}/stages/${stageId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from('reno-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    console.error('[photos] upload failed:', error);
    throw new Error(error.message || '相片上載失敗');
  }
  const row = await createPhotoRecord(userId, stageId, path, caption);
  const { data: signed } = await photoPublicPath(path);
  row.url = signed ? signed.signedUrl : '';
  return row;
}

// Uploads multiple files sequentially (keeps memory/bandwidth predictable on
// mobile connections). Returns array of created rows; any single failure is
// thrown immediately — caller can report which one failed via file.name in the catch.
async function uploadPhotos(userId, projectId, stageId, fileList) {
  const rows = [];
  for (const file of Array.from(fileList)) {
    const row = await uploadPhoto(userId, projectId, stageId, file);
    rows.push(row);
  }
  return rows;
}

// Reads a Blob's actual pixel dimensions (a quick extra decode — cheap since
// the blob is already compressed to ≤300KB). Needed so measurement math can
// convert normalized (0-1) point coordinates to real pixels without depending
// on however large the <img> happens to be rendered on screen.
function loadImageDims(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('讀取相片尺寸失敗')); };
    img.src = url;
  });
}

// Compresses + uploads a room's floor plan image, updates reno_rooms with the
// new path, and clears any previous measurements/scale — they were measured
// against the old image and no longer mean anything against a new one.
async function uploadFloorPlan(userId, roomId, file) {
  const blob = await compressImage(file);
  const { width, height } = await loadImageDims(blob);
  const path = await uploadFloorPlanFile(userId, roomId, blob);
  return updateRoom(roomId, {
    floor_plan_path: path,
    floor_plan_width: width,
    floor_plan_height: height,
    floor_plan_scale: null,
    floor_plan_measurements: [],
  });
}

// Compresses + uploads one design reference photo for a room (reno_room_photos —
// separate from the floor plan; these are just a gallery, never measured on).
async function uploadRoomPhoto(userId, roomId, file, caption) {
  const blob = await compressImage(file);
  const ext = 'jpg';
  const path = `${userId}/room-photos/${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('reno-photos').upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) {
    console.error('[photos] room photo upload failed:', error);
    throw new Error(error.message || '相片上載失敗');
  }
  const row = await createRoomPhotoRecord(userId, roomId, path, caption);
  const { data: signed } = await roomPhotoSignedUrl(path);
  row.url = signed ? signed.signedUrl : '';
  return row;
}
