-- Thêm cột chủng loại dừa cho lô nguyên liệu — trước đây thông tin này bị
-- gõ lẫn vào Ghi chú (VD: "Xiêm xanh", "Trọc chóp"), giờ tách riêng thành
-- cột của nó để lọc/báo cáo theo chủng loại sau này.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.raw_batches add column if not exists chung_loai text;
