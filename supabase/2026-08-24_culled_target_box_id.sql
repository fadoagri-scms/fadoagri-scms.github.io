-- "Xử lý hàng dạt" → "Sản xuất qua đơn khác" khi nguồn là Hàng dạt (chưa
-- đóng gói) giờ tạo 1 dòng Quy cách MỚI trong factory_batch_boxes của lô
-- đích (cộng vào "Thùng đóng gói"/Sản xuất) thay vì cộng nhầm vào "Đã xuất"
-- như trước (hàng dạt chưa hề đóng gói, không thể coi là "đã xuất").
--
-- Cột này lưu lại ID của đúng dòng factory_batch_boxes đã tạo ra, để sau
-- này xóa bản ghi ở "Lịch sử xử lý" thì xóa lại đúng dòng đó — không đụng
-- nhầm dòng Quy cách khác trùng Sản phẩm+Quy cách của lô đích.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_culled_processing
  add column if not exists target_box_id bigint references public.factory_batch_boxes(id) on delete set null;

notify pgrst, 'reload schema';
