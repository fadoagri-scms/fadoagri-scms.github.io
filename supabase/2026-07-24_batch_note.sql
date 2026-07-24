-- Thêm "Ghi chú" tự do cho từng lô hàng — hiện thẳng ở bảng Tổng hợp lô
-- hàng (Đánh giá chất lượng), sửa trực tiếp ngay trong ô, không cần mở
-- modal. Lưu ở batch_info giống Hình thức/Trạng thái đơn hàng.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists note text;
