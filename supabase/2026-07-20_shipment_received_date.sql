-- Thêm "Ngày khách nhận hàng" cho lô vận chuyển (module Logistics). Feedback
-- KH dùng ngày này + 3 ngày để tính hạn khách phải gửi feedback, và cảnh báo
-- những lô đã quá hạn mà chưa có feedback.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).

alter table public.shipments add column if not exists received_date date;
