-- Thêm cột "Ngành hàng" vào qc_checks để phân biệt đúng luồng kiểm soát chất lượng:
--   - Dừa: kiểm soát nội bộ từ Vùng nguyên liệu -> Xưởng dừa Ba Phi -> QC
--   - Chanh / Thanh long / Khác: hàng thương mại, kiểm soát trực tiếp từ Nhà cung cấp -> QC
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).

alter table public.qc_checks add column if not exists category text;

-- Gán lại ngành hàng cho các dòng dữ liệu mẫu đã có sẵn (theo tiền tố mã lô cũ)
update public.qc_checks set category = 'Dừa' where category is null and (batch_code like 'NL-%' or batch_code like 'DUA-%');
update public.qc_checks set category = 'Chanh' where category is null and batch_code like 'CHANH-%';
update public.qc_checks set category = 'Thanh long' where category is null and batch_code like 'TL-%';
update public.qc_checks set category = 'Khác' where category is null;
