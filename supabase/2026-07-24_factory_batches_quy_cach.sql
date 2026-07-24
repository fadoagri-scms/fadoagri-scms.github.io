-- Thêm "Quy cách" (số trái/thùng) cho từng đợt sản xuất — dùng để tự tính
-- Số lượng thùng = Thành phẩm (trái) / Quy cách, và để Tồn kho/QC quy đổi
-- qua lại giữa trái và thùng khi cần.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_batches add column if not exists quy_cach numeric;
