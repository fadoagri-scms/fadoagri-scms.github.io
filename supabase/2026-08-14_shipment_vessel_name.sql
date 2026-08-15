-- Tên tàu cho từng lô vận chuyển — chỉ để tiện tra IMO trên VesselFinder
-- (nút "Tra IMO trên VesselFinder" mở sẵn kết quả tìm theo đúng tên này,
-- đỡ phải gõ lại tên tàu trên trang đó). Không dùng để nhúng bản đồ trực
-- tiếp (bản đồ bắt buộc cần IMO, xem 2026-08-14_shipment_imo.sql).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.shipments add column if not exists vessel_name text;
