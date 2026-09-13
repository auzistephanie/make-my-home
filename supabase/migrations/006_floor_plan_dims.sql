-- MakeMyHome (裝修無伏) — 平面圖度尺要用返原圖 naturalWidth/naturalHeight
-- 先可以將 0-1 normalized 座標準確換算做米數（唔受畫面顯示大小影響）。
alter table reno_rooms
  add column floor_plan_width int,
  add column floor_plan_height int;
