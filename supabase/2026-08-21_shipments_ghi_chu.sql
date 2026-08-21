-- Ghi chú cho từng lô vận chuyển — dùng để giải thích nguyên nhân khi trễ
-- hẹn giao (ETA) so với ngày khách thực nhận hàng, để giám đốc/quản lý
-- đánh giá được lý do (kẹt cảng, chờ thông quan, đối tác giao chậm...)
-- thay vì chỉ thấy trễ mà không rõ vì sao.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.shipments add column if not exists ghi_chu text;
