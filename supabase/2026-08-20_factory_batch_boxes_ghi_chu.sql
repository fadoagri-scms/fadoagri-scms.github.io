-- Ghi chú riêng cho từng dòng Quy cách ở "Cập nhật sản xuất" — VD đánh dấu
-- "hàng dư chưa phân đơn" khi 1 đợt sản xuất có phần không đạt chuẩn cho
-- đơn hiện tại, tách dòng riêng để theo dõi tồn kho tách biệt. Không ảnh
-- hưởng cách hệ thống ghép dữ liệu Sản xuất/Tồn kho (vẫn theo Sản phẩm +
-- Quy cách như cũ) — cột này thuần hiển thị/ghi chú.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.factory_batch_boxes add column if not exists ghi_chu text;
