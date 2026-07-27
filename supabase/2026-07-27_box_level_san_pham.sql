-- Chuyển "Sản phẩm" từ cấp cả đợt sản xuất (factory_batches.san_pham, 1 giá
-- trị dùng chung cho mọi Quy cách) xuống cấp TỪNG dòng Quy cách đóng thùng
-- (factory_batch_boxes) — cho phép 1 đợt sản xuất vừa ra sản phẩm chính vừa
-- ra vài thùng sản phẩm khác (VD: làm mẫu cho khách khác) mà không bị gắn
-- nhầm tên sản phẩm. factory_finished_stock (Tồn kho/Đã xuất) đi theo, đổi
-- khoá duy nhất từ (batch, chung_loai, quy_cach) sang thêm cả san_pham.
--
-- factory_batches.san_pham vẫn giữ lại (không xoá) làm tên đại diện cho cả
-- đợt (QC và vài chỗ hiển thị cũ vẫn đọc) — app giờ tự set giá trị này bằng
-- sản phẩm của dòng Quy cách đầu tiên mỗi khi lưu.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_batch_boxes add column if not exists san_pham text not null default '';
alter table public.factory_finished_stock add column if not exists san_pham text not null default '';

-- Backfill dữ liệu cũ: lấy san_pham từ factory_batches (đợt sản xuất) gán
-- xuống từng dòng Quy cách chưa có san_pham riêng.
update public.factory_batch_boxes b
set san_pham = fb.san_pham
from public.factory_batches fb
where fb.id = b.factory_batch_id
  and b.san_pham = ''
  and fb.san_pham is not null;

-- Backfill factory_finished_stock: khớp gần đúng qua (batch, chung_loai,
-- quy_cach) tới factory_batch_boxes để lấy san_pham tương ứng — PHẢI khớp cả
-- chung_loai (không chỉ batch) vì 1 lô có thể có nhiều chủng loại, mỗi chủng
-- loại dùng chung 1 Quy cách khác nhau (thiếu chung_loai từng làm quy_cach=12
-- của "Dừa trọc chóp" và "Xiêm xanh" trong cùng batch bị coi là mơ hồ dù mỗi
-- chủng loại thực ra chỉ có đúng 1 sản phẩm cho Quy cách đó). Chỉ áp dụng khi
-- khớp DUY NHẤT 1 sản phẩm cho tổ hợp đó, tránh gán nhầm khi vẫn còn mơ hồ.
with matched as (
  select s.id, min(b.san_pham) as san_pham, count(distinct b.san_pham) as distinct_count
  from public.factory_finished_stock s
  join public.raw_batches rb on rb.batch = s.batch and rb.chung_loai = s.chung_loai
  join public.factory_batches fb on fb.raw_batch_id = rb.id
  join public.factory_batch_boxes b on b.factory_batch_id = fb.id and b.quy_cach = s.quy_cach
  where s.san_pham = ''
  group by s.id
)
update public.factory_finished_stock s
set san_pham = matched.san_pham
from matched
where matched.id = s.id and matched.distinct_count = 1 and matched.san_pham is not null;

alter table public.factory_finished_stock
  drop constraint if exists factory_finished_stock_batch_chungloai_quycach_key;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'factory_finished_stock'
      and constraint_name = 'factory_finished_stock_batch_chungloai_quycach_sanpham_key'
  ) then
    alter table public.factory_finished_stock
      add constraint factory_finished_stock_batch_chungloai_quycach_sanpham_key unique (batch, chung_loai, quy_cach, san_pham);
  end if;
end $$;
