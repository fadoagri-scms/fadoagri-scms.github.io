-- Đổi "Lý do dạt bỏ" từ danh sách cố định (Bể gáo/Nứt đầu/Khác) sang nhập
-- tay tự do — bỏ ràng buộc CHECK giới hạn giá trị đã thêm ở
-- 2026-08-27_factory_batch_waste.sql.
--
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_batch_waste drop constraint if exists factory_batch_waste_ly_do_check;
