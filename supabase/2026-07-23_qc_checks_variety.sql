-- Thêm cột chủng loại vào qc_checks — cho phép ghi kết quả kiểm QC riêng
-- theo từng chủng loại dừa (Xiêm xanh, Dừa trọc...) trong 1 lô hàng, thay vì
-- gộp chung 1 kết quả cho cả lô khi lô đó thật ra gồm nhiều chủng loại khác
-- nhau (mỗi chủng loại có thể đạt/không đạt khác nhau).
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.qc_checks add column if not exists chung_loai text;
