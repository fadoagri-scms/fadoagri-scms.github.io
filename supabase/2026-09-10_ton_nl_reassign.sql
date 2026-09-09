-- Xưởng Ba Phi — "Xử lý hàng tồn & rớt" thêm nguồn thứ 4: "Tồn NL chưa SX"
-- (factory_batches.ton_nl_qty). 3 hướng xử lý: bán thô / dạt bỏ / đưa sang
-- lô khác sản xuất (cộng vào Số lượng nhập của lô đích — thêm 1 dòng
-- raw_batches mới, lô đích tự chế biến như thường).
--
-- Cũng dọn lại khóa duy nhất factory_finished_stock cho chắc (một số DB
-- chạy migration 2026-09-09 bị vướng dòng trùng nên constraint chưa lên).
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

-- ============ 1) Cột target_raw_batch_id cho lịch sử "đưa sang lô khác" ============
alter table public.factory_culled_processing
  add column if not exists target_raw_batch_id bigint references public.raw_batches(id) on delete set null;
-- Với source_type='ton_nl' + xu_ly_type='reassign': id dòng raw_batches mới
-- được tạo ở lô đích — xoá lịch sử sẽ xoá lại dòng đó (nếu chưa sản xuất).

-- Cột rework_pass (từ migration 2026-09-09) — thêm lại phòng khi DB chưa có,
-- vì code Xưởng đọc/ghi cột này (loại xử lý "Xử lý lại cho đạt chuẩn").
alter table public.factory_culled_processing
  add column if not exists rework_pass numeric;

-- ============ 2) Dọn trùng + khóa duy nhất factory_finished_stock ============
-- Dồn "đã xuất" của các dòng trùng (batch, quy_cach, san_pham) vào dòng id nhỏ nhất.
update public.factory_finished_stock keep
set exported_qty = agg.sum_exp,
    export_date  = coalesce(agg.max_date, keep.export_date),
    chung_loai   = 'Gộp',
    deleted_at   = null
from (
  select min(id) as keep_id,
         sum(coalesce(exported_qty, 0)) as sum_exp,
         max(export_date) as max_date
  from public.factory_finished_stock
  where deleted_at is null
  group by batch, quy_cach, san_pham
  having count(*) > 1
) agg
where keep.id = agg.keep_id;

-- Xoá cứng mọi dòng trùng còn lại (NULL quy_cach xử lý đúng bằng is not distinct from).
delete from public.factory_finished_stock a
using public.factory_finished_stock b
where a.batch = b.batch
  and a.quy_cach is not distinct from b.quy_cach
  and a.san_pham = b.san_pham
  and a.id > b.id;

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

-- ============ 3) Nhắc PostgREST nạp lại lược đồ ============
notify pgrst, 'reload schema';
