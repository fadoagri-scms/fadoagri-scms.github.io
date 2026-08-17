-- Số container + hãng tàu cho từng lô vận chuyển — dùng để mở đúng trang
-- tra cứu vị trí container của hãng tàu ở tab mới (module Logistics, nút
-- "Tra vị trí container"). Không bắt buộc, để trống nếu chưa biết.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.shipments add column if not exists container_no text;
alter table public.shipments add column if not exists shipping_line text;
