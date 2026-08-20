-- Thêm ô "Tỷ lệ đạt chuẩn (%)" nhập tay cho từng lượt nhập nguyên liệu —
-- chính xác hơn Trạng thái (chỉ có 3 mức Chờ kiểm tra/Đạt chuẩn/Từ chối một
-- phần). Thẻ "Tỷ lệ đạt chuẩn đầu vào" ở đầu trang Vùng nguyên liệu ưu tiên
-- lấy trung bình theo % này khi có, rơi về cách tính cũ (theo Trạng thái)
-- cho các lượt nhập cũ chưa có % thủ công.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.raw_batches add column if not exists ty_le_dat_chuan numeric;
