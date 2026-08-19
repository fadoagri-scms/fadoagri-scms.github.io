-- Truy xuất nguồn gốc công khai qua QR — thêm các cột điều khiển việc công
-- khai (mặc định TẮT, phải chủ động bật từng lô) và 1 view an toàn riêng chỉ
-- hé lộ đúng phần được phép cho khách quét mã (KHÔNG có tên khách hàng, giá
-- trị đơn hàng, thông tin liên hệ NCC/đầu mối thu mua, ghi chú nội bộ).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists public_trace_code text unique;
alter table public.batch_info add column if not exists trace_enabled boolean not null default false;
-- Nhập tay thay vì tự động lấy từ NCC/đầu mối thu mua thật — tránh lộ quan
-- hệ kinh doanh cho bất kỳ ai quét được mã.
alter table public.batch_info add column if not exists trace_region text;
alter table public.batch_info add column if not exists trace_packed_date date;
alter table public.batch_info add column if not exists trace_packing_text text;

-- View chạy với quyền của người tạo (mặc định security_invoker = false ở
-- Postgres) nên đọc xuyên qua được các bảng gốc đang khoá RLS chỉ cho
-- "authenticated" — KHÔNG mở RLS của các bảng gốc, chỉ view này được cấp
-- quyền đọc công khai (anon), và chỉ trả về đúng các cột liệt kê dưới đây.
create or replace view public.batch_trace_public
with (security_invoker = false)
as
select
  bi.public_trace_code as trace_code,
  bi.san_pham as product_name,
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

grant usage on schema public to anon;
grant select on public.batch_trace_public to anon;
