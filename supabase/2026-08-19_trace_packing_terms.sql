-- Đổi cách nhập bản tiếng Anh cho "Đóng gói" — thay vì gõ nguyên đoạn theo
-- đúng cấu trúc "Nguyên liệu → Sản phẩm · Số lượng" (dễ gõ sai dấu), giờ
-- lưu 1 từ điển nhỏ {tên tiếng Việt: bản dịch} — mỗi tên riêng chỉ cần gõ
-- đúng nghĩa, không cần theo cấu trúc gì, hệ thống tự ghép lại khi hiển thị.
-- Cột trace_packing_text_en cũ không dùng nữa (không xóa, tránh mất dữ liệu
-- cũ nếu có).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists trace_packing_terms_en jsonb;

create or replace view public.batch_trace_public
with (security_invoker = false)
as
select
  bi.public_trace_code as trace_code,
  coalesce(bi.trace_product_name, bi.san_pham) as product_name,
  bi.trace_region as region,
  coalesce(bi.trace_variety, rb.variety) as variety,
  rb.harvest_date,
  bi.trace_packed_date as packed_date,
  bi.trace_packing_text as packing_text,
  qc.qc_status,
  qc.qc_pass_rate,
  qc.qc_date,
  sh.stage as shipping_stage,
  sh.eta as shipping_eta,
  sh.received_date as shipping_received_date,
  bi.trace_supplier_name as supplier_name,
  bi.trace_product_name_en as product_name_en,
  bi.trace_region_en as region_en,
  bi.trace_supplier_name_en as supplier_name_en,
  bi.trace_batch_label as batch_label,
  bi.trace_variety_en as variety_en,
  bi.trace_packing_terms_en as packing_terms_en
from public.batch_info bi
left join lateral (
  select
    min(ngay_nhap) as harvest_date,
    string_agg(distinct chung_loai, ', ') filter (where chung_loai is not null and chung_loai <> '') as variety
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
