-- Cho phép xóa lô nguyên liệu (raw_batches) ngay cả khi đã có dữ liệu sản
-- xuất liên kết (factory_batches) — xóa lô nguyên liệu sẽ tự động xóa luôn
-- dòng sản xuất tương ứng, vì dòng đó không có ý nghĩa gì khi tách rời khỏi
-- lô nguyên liệu gốc (tab Xưởng sản xuất chỉ hiển thị các dòng join từ
-- raw_batches).
--
-- Trước đây constraint raw_batch_id không có ON DELETE CASCADE nên xóa lô
-- nguyên liệu đã có dữ liệu sản xuất sẽ báo lỗi:
--   "update or delete on table raw_batches violates foreign key
--    constraint factory_batches_raw_batch_id_fkey"
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_batches drop constraint if exists factory_batches_raw_batch_id_fkey;
alter table public.factory_batches
  add constraint factory_batches_raw_batch_id_fkey
  foreign key (raw_batch_id) references public.raw_batches(id) on delete cascade;
