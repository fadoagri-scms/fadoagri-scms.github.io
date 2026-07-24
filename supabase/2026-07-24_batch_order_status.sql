-- Thêm "Trạng thái đơn hàng" (Chưa đóng hàng / Đã đóng hàng) cho từng lô —
-- giống Hình thức, lưu ở batch_info (khoá theo batch). Khi chuyển sang
-- "Đã đóng hàng", app sẽ tự tạo 1 dòng ở Logistics (nếu lô đó chưa có) để
-- bắt đầu theo dõi vận chuyển ngay.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists order_status text;
