-- Bổ sung cho trang truy xuất theo TỪNG sản phẩm (batch_trace_product_public):
--   1) Cột quy_cach (VD "12 trái/thùng") — hiện trong khối "Đóng gói" cùng
--      Tên sản phẩm + Số lượng thùng, tự tính khi bật công khai (giống cách
--      variety đã tính từ trước).
--   2) Lấy thêm packing_text/packing_terms_en CỦA CẢ LÔ (batch_info) — cho
--      khối mới "Thông tin lô hàng", liệt kê lại toàn bộ sản phẩm trong cùng
--      lô (như trang mã chung cũ), để khách biết còn sản phẩm nào khác đi
--      cùng container.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → chọn hết (Ctrl+A) → Run.
-- An toàn chạy nhiều lần.

alter table public.batch_trace_products add column if not exists quy_cach text;

create or replace view public.batch_trace_product_public
with (security_invoker = false)
as
select
  btp.public_trace_code as trace_code,
  btp.san_pham as product_name,
  btp.san_pham_en as product_name_en,
  btp.variety,
  btp.variety_en,
  bi.trace_region as region,
  bi.trace_region_en as region_en,
  bi.trace_supplier_name as supplier_name,
  bi.trace_supplier_name_en as supplier_name_en,
  rb.harvest_date,
  bi.trace_packed_date as packed_date,
  btp.total_thung as qty_thung,
  'Đạt'::text as qc_status,
  100::numeric as qc_pass_rate,
  qc.qc_date,
  sh.stage as shipping_stage,
  sh.eta as shipping_eta,
  sh.received_date as shipping_received_date,
  bi.trace_batch_label as batch_label,
  exp.best_before,
  sh.etd as shipping_etd,
  btp.quy_cach,
  bi.trace_packing_text as batch_packing_text,
  bi.trace_packing_terms_en as batch_packing_terms_en
from public.batch_trace_products btp
join public.batch_info bi on bi.batch = btp.batch
left join lateral (
  select min(ngay_nhap) as harvest_date
  from public.raw_batches
  where batch = btp.batch and deleted_at is null
) rb on true
left join lateral (
  select max(created_at)::date as qc_date
  from public.qc_checks
  where batch_code = btp.batch and check_type = 'Thành phẩm' and deleted_at is null
) qc on true
left join lateral (
  select stage, eta, etd, received_date
  from public.shipments
  where batch_code = btp.batch and deleted_at is null
  order by created_at desc
  limit 1
) sh on true
left join lateral (
  select min(fb.production_date + (fbb.han_su_dung_ngay || ' days')::interval)::date as best_before
  from public.raw_batches rb2
  join public.factory_batches fb on fb.raw_batch_id = rb2.id
  join public.factory_batch_boxes fbb on fbb.factory_batch_id = fb.id
  where rb2.batch = btp.batch and rb2.deleted_at is null
    and fbb.san_pham = btp.san_pham
    and fb.production_date is not null and fbb.han_su_dung_ngay is not null
) exp on true
where btp.trace_enabled = true and btp.public_trace_code is not null and btp.deleted_at is null;

grant select on public.batch_trace_product_public to anon;
