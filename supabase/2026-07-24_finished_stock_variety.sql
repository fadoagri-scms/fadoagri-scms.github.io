-- Tồn kho thành phẩm giờ theo dõi RIÊNG từng chủng loại dừa trong 1 lô hàng
-- (trước đây 1 dòng/lô hàng, gộp chung mọi chủng loại) — mỗi chủng loại có
-- ngày xuất/số lượng xuất (thùng) độc lập.
--
-- Các bản ghi cũ (trước khi có cột này) mặc định gán "Chưa phân loại" —
-- khớp đúng quy ước nhãn đang dùng ở Vùng nguyên liệu/Đánh giá chất lượng
-- cho các lô chưa từng nhập chủng loại.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_finished_stock
  add column if not exists chung_loai text not null default 'Chưa phân loại';

alter table public.factory_finished_stock
  drop constraint if exists factory_finished_stock_batch_key;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'factory_finished_stock'
      and constraint_name = 'factory_finished_stock_batch_chungloai_key'
  ) then
    alter table public.factory_finished_stock
      add constraint factory_finished_stock_batch_chungloai_key unique (batch, chung_loai);
  end if;
end $$;
