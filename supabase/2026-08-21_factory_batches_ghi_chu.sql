-- Ghi chú cho cả 1 đợt sản xuất (factory_batches) — dùng để giải thích
-- nguyên nhân khi "Trái bị dạt" cao: do khâu nhập dừa, khâu gọt, hay do
-- trích ra sản xuất/chia bớt cho lô khác, để giám đốc/quản lý đánh giá được
-- lý do thay vì chỉ thấy con số. Khác với factory_batch_boxes.ghi_chu (ghi
-- chú riêng từng dòng Quy cách, VD "hàng dư chưa phân đơn") — cột này ở cấp
-- CẢ ĐỢT sản xuất, đúng cấp mà "Hao hụt"/"Trái bị dạt" đang tính.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.factory_batches add column if not exists ghi_chu text;
