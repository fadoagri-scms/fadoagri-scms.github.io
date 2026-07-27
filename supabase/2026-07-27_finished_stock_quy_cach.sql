-- "Đã xuất (thùng)" giờ theo dõi RIÊNG từng Quy cách trong 1 chủng loại
-- (trước đây gộp chung 1 số cho cả chủng loại, dù chủng loại đó có thể
-- đóng nhiều quy cách khác nhau) — khoá duy nhất đổi từ (batch, chung_loai)
-- sang (batch, chung_loai, quy_cach).
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_finished_stock add column if not exists quy_cach numeric;

alter table public.factory_finished_stock
  drop constraint if exists factory_finished_stock_batch_chungloai_key;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'factory_finished_stock'
      and constraint_name = 'factory_finished_stock_batch_chungloai_quycach_key'
  ) then
    alter table public.factory_finished_stock
      add constraint factory_finished_stock_batch_chungloai_quycach_key unique (batch, chung_loai, quy_cach);
  end if;
end $$;
