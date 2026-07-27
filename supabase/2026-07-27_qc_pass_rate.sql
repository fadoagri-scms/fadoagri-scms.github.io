-- Cho phép ghi số lượng kiểm / số lượng đạt cho mỗi lần kiểm QC, thay vì chỉ
-- có 1 kết quả tổng quát (Đạt/Đạt có điều kiện/Không đạt 1 phần) — để tính
-- được % đạt thực tế thay vì chỉ đếm nhị phân đạt/không đạt.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.qc_checks add column if not exists so_luong_kiem numeric;
alter table public.qc_checks add column if not exists so_luong_dat numeric;
