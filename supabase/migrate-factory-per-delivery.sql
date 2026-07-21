-- Chuyển factory_batches từ "1 dòng/lô hàng" sang "1 dòng/đợt nhập nguyên
-- liệu" (raw_batch_id) — vì mỗi đợt nhập từ 1 NCC được chế biến như 1 lượt
-- riêng, có ngày sản xuất/thành phẩm/hao hụt riêng.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run. Chạy 1 lần.

alter table public.factory_batches drop constraint if exists factory_batches_batch_code_key;
alter table public.factory_batches add column if not exists raw_batch_id bigint references public.raw_batches(id);
alter table public.factory_batches add column if not exists production_date date;
alter table public.factory_batches add column if not exists finished_qty numeric;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'factory_batches'
      and constraint_name = 'factory_batches_raw_batch_id_key'
  ) then
    alter table public.factory_batches add constraint factory_batches_raw_batch_id_key unique (raw_batch_id);
  end if;
end $$;

-- 2 dòng demo cũ (DOUYIN - 06.26, MINH NHÂN - 24.26) không gắn với đợt nhập
-- cụ thể nào (raw_batch_id null) nên không còn phù hợp với mô hình mới — xóa
-- để giao diện không bị lẫn dữ liệu cũ. Dữ liệu Vùng nguyên liệu không bị
-- ảnh hưởng, chỉ xóa phần theo dõi sản xuất cũ.
delete from public.factory_batches where raw_batch_id is null;
