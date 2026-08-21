-- "Ngôn ngữ đặc biệt" cho trang truy xuất công khai — bình thường chỉ cần
-- song ngữ Việt/Anh, nhưng 1 số lô cần ưu ái đối tác chiến lược ở nước khác
-- (Nhật/Hàn/Trung...) nên thêm 1 CHỖ NGÔN NGỮ THỨ 3 dùng CHUNG cho MỌI nước
-- (không tạo cột _ja/_ko/_zh riêng, tránh phình bảng mỗi lần thêm nước mới)
-- — mỗi lô tự chọn đang dùng ngôn ngữ nào qua trace_extra_lang (VD 'ja'),
-- các cột "_extra" bên dưới hiểu theo đúng ngôn ngữ đó.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → chọn hết (Ctrl+A) → Run.
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists trace_extra_lang text;
alter table public.batch_info add column if not exists trace_product_name_extra text;
alter table public.batch_info add column if not exists trace_supplier_name_extra text;
alter table public.batch_info add column if not exists trace_importer_name_extra text;
alter table public.batch_info add column if not exists trace_variety_extra text;
alter table public.batch_info add column if not exists trace_region_extra text;
alter table public.batch_info add column if not exists trace_packing_terms_extra jsonb;

alter table public.batch_trace_products add column if not exists san_pham_extra text;
alter table public.batch_trace_products add column if not exists variety_extra text;
alter table public.batch_trace_products add column if not exists region_extra text;

-- Thêm cột MỚI vào CUỐI danh sách SELECT — CREATE OR REPLACE VIEW không cho
-- chèn/đổi vị trí cột đã có (lỗi 42P16), xem ghi chú các file 2026-08-19_trace_*.sql.
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
  bi.trace_packing_terms_extra as packing_terms_extra
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
left join lateral (
  select min(fb.production_date + (fbb.han_su_dung_ngay || ' days')::interval)::date as best_before
  from public.raw_batches rb2
  join public.factory_batches fb on fb.raw_batch_id = rb2.id
  join public.factory_batch_boxes fbb on fbb.factory_batch_id = fb.id
  where rb2.batch = bi.batch and rb2.deleted_at is null
    and fb.production_date is not null and fbb.han_su_dung_ngay is not null
) exp on true
where bi.trace_enabled = true and bi.public_trace_code is not null;

grant select on public.batch_trace_public to anon;

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
  bi.trace_packing_terms_extra as batch_packing_terms_extra
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
