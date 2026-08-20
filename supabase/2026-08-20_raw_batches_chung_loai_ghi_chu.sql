-- "Chủng loại" ở Vùng nguyên liệu đổi từ gõ tay tự do sang dropdown cố định
-- (Xiêm xanh/Xiêm đỏ/Mã lai bầu/Mã lai chu/Dừa khô/Dừa trọc/Dừa mứt/Dừa
-- sáp/Khác) — cột chung_loai_ghi_chu này chỉ dùng khi chọn "Khác", ghi chú
-- cụ thể chủng loại thật sự là gì.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.raw_batches add column if not exists chung_loai_ghi_chu text;
