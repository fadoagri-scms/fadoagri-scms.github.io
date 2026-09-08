-- Trang truy xuất công khai — 2 chỉnh sửa theo phản hồi thực tế:
--
-- 1) "Hạn sử dụng" (best_before) tính từ NGÀY ĐÓNG HÀNG, không phải ngày sản
--    xuất. Đúng nghĩa "best before" trên bao bì. Công thức mới:
--       best_before = coalesce(trace_packed_date, production_date) + hạn dùng (ngày)
--    Chưa nhập ngày đóng hàng thì vẫn lùi về ngày sản xuất như cũ.
--
-- 2) Thêm cột ship_out_date = ngày hàng RỜI KHO Xưởng Ba Phi
--    (factory_finished_stock.export_date, tab "Xuất hàng"). trace.html dùng
--    làm mốc "Ngày xuất hàng" trong Hành trình vận chuyển thay cho ETD/'Cảng đi'.
--    Cột thêm vào CUỐI danh sách SELECT (CREATE OR REPLACE VIEW không cho
--    chèn/đổi vị trí cột đã có — xem ghi chú các file 2026-08-19_trace_*.sql).
--
-- Cách dùng: Supabase Dashboard → SQL Editor → chọn hết (Ctrl+A) → Run.
-- An toàn chạy nhiều lần.

-- ============ View mã chung cả lô ============
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
  'Đạt'::text as qc_status,
  100::numeric as qc_pass_rate,
  qc.qc_date,
  sh.stage as shipping_stage,
  sh.eta as shipping_eta,
  sh.received_date as shipping_received_date,
  bi.trace_supplier_name as supplier_name,
  bi.trace_product_name_en as product_name_en,
  bi.trace_region_en as region_en,
  bi.trace_supplier_name_en as supplier_name_en,
  bi.trace_packing_text_en as packing_text_en,
  bi.trace_batch_label as batch_label,
  bi.trace_variety_en as variety_en,
  bi.trace_packing_terms_en as packing_terms_en,
  exp.best_before,
  sh.etd as shipping_etd,
  bi.trace_importer_name as importer_name,
  bi.trace_importer_name_en as importer_name_en,
  bi.trace_extra_lang as extra_lang,
  bi.trace_product_name_extra as product_name_extra,
  bi.trace_supplier_name_extra as supplier_name_extra,
  bi.trace_importer_name_extra as importer_name_extra,
  bi.trace_variety_extra as variety_extra,
  bi.trace_region_extra as region_extra,
  bi.trace_packing_terms_extra as packing_terms_extra,
  xk.ship_out_date
from public.batch_info bi
left join lateral (
  select
    min(ngay_nhap) as harvest_date,
    string_agg(distinct chung_loai, ', ') filter (where chung_loai is not null and chung_loai <> '') as variety
  from public.raw_batches
  where batch = bi.batch and deleted_at is null
) rb on true
left join lateral (
  select max(created_at)::date as qc_date
  from public.qc_checks
  where batch_code = bi.batch and check_type = 'Thành phẩm' and deleted_at is null
) qc on true
left join lateral (
  select stage, eta, etd, received_date
  from public.shipments
  where batch_code = bi.batch and deleted_at is null
  order by created_at desc
  limit 1
) sh on true
-- Hạn sử dụng cả lô = mốc SỚM NHẤT (FEFO) trong mọi sản phẩm/đợt sản xuất,
-- tính từ NGÀY ĐÓNG HÀNG (trace_packed_date) — chưa nhập thì lùi về ngày sản xuất.
left join lateral (
  select min(coalesce(bi.trace_packed_date, fb.production_date) + (fbb.han_su_dung_ngay || ' days')::interval)::date as best_before
  from public.raw_batches rb2
  join public.factory_batches fb on fb.raw_batch_id = rb2.id
  join public.factory_batch_boxes fbb on fbb.factory_batch_id = fb.id
  where rb2.batch = bi.batch and rb2.deleted_at is null
    and fbb.han_su_dung_ngay is not null
    and coalesce(bi.trace_packed_date, fb.production_date) is not null
) exp on true
-- Ngày rời kho Xưởng — lấy đợt xuất cuối cùng của lô.
left join lateral (
  select max(export_date) as ship_out_date
  from public.factory_finished_stock
  where batch = bi.batch and deleted_at is null and export_date is not null
) xk on true
where bi.trace_enabled = true and bi.public_trace_code is not null;

grant select on public.batch_trace_public to anon;

-- ============ View mã riêng theo từng sản phẩm ============
create or replace view public.batch_trace_product_public
with (security_invoker = false)
as
select
  btp.public_trace_code as trace_code,
  btp.san_pham as product_name,
  btp.san_pham_en as product_name_en,
  btp.variety,
  btp.variety_en,
  coalesce(btp.region, bi.trace_region) as region,
  coalesce(btp.region_en, bi.trace_region_en) as region_en,
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
  bi.trace_packing_terms_en as batch_packing_terms_en,
  bi.trace_importer_name as importer_name,
  bi.trace_importer_name_en as importer_name_en,
  bi.trace_extra_lang as extra_lang,
  btp.san_pham_extra as product_name_extra,
  btp.variety_extra,
  coalesce(btp.region_extra, bi.trace_region_extra) as region_extra,
  bi.trace_supplier_name_extra as supplier_name_extra,
  bi.trace_importer_name_extra as importer_name_extra,
  bi.trace_packing_terms_extra as batch_packing_terms_extra,
  xk.ship_out_date
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
-- Hạn sử dụng của đúng sản phẩm này, tính từ NGÀY ĐÓNG HÀNG (chưa nhập thì
-- lùi về ngày sản xuất); lấy sớm nhất (FEFO) nếu ra từ nhiều đợt sản xuất.
left join lateral (
  select min(coalesce(bi.trace_packed_date, fb.production_date) + (fbb.han_su_dung_ngay || ' days')::interval)::date as best_before
  from public.raw_batches rb2
  join public.factory_batches fb on fb.raw_batch_id = rb2.id
  join public.factory_batch_boxes fbb on fbb.factory_batch_id = fb.id
  where rb2.batch = btp.batch and rb2.deleted_at is null
    and fbb.san_pham = btp.san_pham
    and fbb.han_su_dung_ngay is not null
    and coalesce(bi.trace_packed_date, fb.production_date) is not null
) exp on true
-- Ngày rời kho Xưởng — chung cho cả lô (factory_finished_stock không tách
-- theo sản phẩm), lấy đợt xuất cuối cùng.
left join lateral (
  select max(export_date) as ship_out_date
  from public.factory_finished_stock
  where batch = btp.batch and deleted_at is null and export_date is not null
) xk on true
where btp.trace_enabled = true and btp.public_trace_code is not null and btp.deleted_at is null;

grant select on public.batch_trace_product_public to anon;
