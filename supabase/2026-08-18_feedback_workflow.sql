-- Thêm workflow xử lý khiếu nại cho Feedback KH: người phụ trách + hạn xử lý
-- (trạng thái "Đang xử lý" ở giữa "Chưa xử lý"/"Đã xử lý" không cần đổi
-- schema, chỉ là 1 giá trị text mới trong ô Trạng thái đã có sẵn).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.feedbacks add column if not exists assignee text;
alter table public.feedbacks add column if not exists response_deadline date;
