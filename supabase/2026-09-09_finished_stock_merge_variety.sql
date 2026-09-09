-- Xưởng Ba Phi — bỏ tách "Đã xuất / Tồn kho" theo CHỦNG LOẠI nguyên liệu.
--
-- Vấn đề: cùng 1 sản phẩm + quy cách nhưng ra từ nhiều chủng loại nguyên
-- liệu (VD "Dừa kim cương / 9 trái/thùng" từ cả Xiêm đỏ lẫn Mã lai chu) bị
-- tách thành nhiều dòng đóng gói, mà "Đã xuất" chỉ ghi được vào 1 chủng
-- loại → các dòng còn lại tính tồn kho ra âm sâu / dư toàn bộ.
--
-- Sửa: khóa duy nhất factory_finished_stock đổi thành (batch, quy_cach,
-- san_pham) — KHÔNG còn chung_loai. Cột chung_loai giữ lại nhưng không dùng
-- để phân dòng nữa (đặt 'Gộp' cho các dòng đã gộp).
--
-- Kèm: thêm cột rework_pass cho factory_culled_processing (loại xử lý mới
-- "Xử lý lại cho đạt chuẩn" — Phase 3).
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

-- ============ 1) Gộp các dòng factory_finished_stock trùng (batch, quy_cach, san_pham) ============
-- Dồn exported_qty (cộng) + export_date (mới nhất) của mọi dòng CHƯA XOÁ
-- trong nhóm vào "dòng giữ" = dòng chưa xoá có id nhỏ nhất.
with ranked as (
  select
    id, exported_qty, export_date,
    first_value(id) over (
      partition by batch, coalesce(quy_cach, -1), san_pham
      order by id
    ) as keep_id
  from public.factory_finished_stock
  where deleted_at is null
),
agg as (
  select keep_id,
         sum(coalesce(exported_qty, 0)) as sum_exported,
         max(export_date) as max_date,
         count(*) as n
  from ranked
  group by keep_id
)
update public.factory_finished_stock s
set exported_qty = a.sum_exported,
    export_date  = coalesce(a.max_date, s.export_date),
    chung_loai   = 'Gộp'
from agg a
where s.id = a.keep_id and a.n > 1;

-- ============ 2) Xoá CỨNG mọi dòng không phải "dòng giữ" ============
-- (kể cả dòng đã xoá mềm — ràng buộc unique mới không phân biệt deleted_at
--  nên phải dọn sạch, tránh lỗi khi thêm constraint bên dưới).
delete from public.factory_finished_stock
where id not in (
  select (array_agg(id order by (deleted_at is null) desc, id))[1]
  from public.factory_finished_stock
  group by batch, coalesce(quy_cach, -1), san_pham
);

-- ============ 3) Đổi khóa duy nhất → (batch, quy_cach, san_pham) ============
alter table public.factory_finished_stock drop constraint if exists factory_finished_stock_batch_chungloai_quycach_sanpham_key;
alter table public.factory_finished_stock drop constraint if exists factory_finished_stock_batch_chungloai_quycach_key;
alter table public.factory_finished_stock drop constraint if exists factory_finished_stock_batch_chungloai_key;
alter table public.factory_finished_stock drop constraint if exists factory_finished_stock_batch_key;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'factory_finished_stock'
      and constraint_name = 'factory_finished_stock_batch_quycach_sanpham_key'
  ) then
    alter table public.factory_finished_stock
      add constraint factory_finished_stock_batch_quycach_sanpham_key unique (batch, quy_cach, san_pham);
  end if;
end $$;

-- ============ 4) Cột cho "Xử lý lại (rework)" — Phase 3 ============
alter table public.factory_culled_processing add column if not exists rework_pass numeric;
-- rework_pass = số trái ĐẠT sau khi xử lý lại (chỉ dòng xu_ly_type='rework');
-- qty_trai vẫn là số trái ĐƯA VÀO xử lý lại. (qty_trai − rework_pass) coi như dạt bỏ.

-- ============ 5) raw_batch_id phải cho NULL ============
-- Nguồn 'ton_du' (tồn kho dư) không có raw_batch_id — dùng source_batch/
-- source_san_pham/... thay thế. DB thật đang để cột này NOT NULL (khác với
-- ý định "chỉ 'dat'" trong 2026-08-20_culled_stock_processing.sql) nên
-- insert bản ghi 'ton_du' báo lỗi. Trả lại cho phép NULL.
do $$
begin
  alter table public.factory_culled_processing alter column raw_batch_id drop not null;
exception when others then null;
end $$;
