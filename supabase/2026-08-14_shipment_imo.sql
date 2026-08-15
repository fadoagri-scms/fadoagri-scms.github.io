-- Số IMO tàu cho từng lô vận chuyển — dùng để nhúng bản đồ vị trí tàu sống
-- (VesselFinder, miễn phí, không cần API key) ngay trong màn Logistics khi
-- bấm "Xem vị trí tàu". Không bắt buộc, để trống nếu chưa biết.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.shipments add column if not exists imo text;
