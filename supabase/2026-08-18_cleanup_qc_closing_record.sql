-- Dọn dẹp phần "Ghi nhận đóng cont" đã gỡ khỏi code (2026-08-18) — xóa bảng
-- và storage bucket không còn dùng nữa.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- LƯU Ý: lệnh này xóa vĩnh viễn mọi dữ liệu đã nhập/ảnh đã tải trong tính
-- năng đó (nếu có) — không hoàn tác được.

drop policy if exists "qc-photos public read" on storage.objects;
drop policy if exists "qc-photos public write" on storage.objects;
drop policy if exists "qc-photos public delete" on storage.objects;

delete from storage.objects where bucket_id = 'qc-photos';
delete from storage.buckets where id = 'qc-photos';

drop table if exists public.qc_closing_records;
