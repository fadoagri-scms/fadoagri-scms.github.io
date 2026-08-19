-- Sửa lỗi trang truy xuất nguồn gốc hiện "Sản phẩm chưa đặt tên" dù lô đã có
-- sản phẩm thật — nguyên nhân: product_name trước đó lấy từ
-- batch_info.san_pham ("Sản phẩm dự kiến" nhập lúc tạo đơn, thường bỏ trống
-- với lô nhiều loại hàng). Thêm cột riêng trace_product_name (tự điền từ
-- Quy cách đóng thùng thật qua nút "Lấy từ hệ thống", KHÔNG dùng chung với
-- san_pham để khỏi ảnh hưởng chỗ khác đang hiển thị "Sản phẩm dự kiến").
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists trace_product_name text;

create or replace view public.batch_trace_public
with (security_invoker = false)
as
select
  bi.public_trace_code as trace_code,
  coalesce(bi.trace_product_name, bi.san_pham) as product_name,
  bi.trace_region as region,
  rb.variety,
  rb.harvest_date,
  bi.trace_packed_date as packed_date,
  bi.trace_packing_text as packing_text,
  qc.qc_status,
  qc.qc_pass_rate,
  qc.qc_date,
  sh.stage as shipping_stage,
  sh.eta as shipping_eta,
  sh.received_date as shipping_received_date
from public.batch_info bi
left join lateral (
  select
    min(ngay_nhap) as harvest_date,
    (array_agg(chung_loai order by ngay_nhap) filter (where chung_loai is not null and chung_loai <> ''))[1] as variety
  from public.raw_batches
  where batch = bi.batch and deleted_at is null
) rb on true
left join lateral (
  select
    case
      when bool_or(result = 'Không đạt 1 phần') then 'Không đạt 1 phần'
      when count(*) filter (where result is not null and result <> 'Chờ xác nhận') = 0 then 'Chờ xác nhận'
      else 'Đạt'
    end as qc_status,
    case when sum(so_luong_kiem) > 0
      then round(100.0 * sum(coalesce(so_luong_dat, 0)) / sum(so_luong_kiem))
      else null end as qc_pass_rate,
    max(created_at)::date as qc_date
  from public.qc_checks
  where batch_code = bi.batch and check_type = 'Thành phẩm' and deleted_at is null
) qc on true
left join lateral (
  select stage, eta, received_date
  from public.shipments
  where batch_code = bi.batch and deleted_at is null
  order by created_at desc
  limit 1
) sh on true
where bi.trace_enabled = true and bi.public_trace_code is not null;

grant select on public.batch_trace_public to anon;
