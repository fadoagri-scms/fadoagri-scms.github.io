-- Bật/Tắt độc lập cho mã QR và mã vạch truy xuất nguồn gốc (cùng trỏ tới 1
-- link/mã bí mật như trước — chỉ khác nhau ở có hiển thị/xuất loại nào),
-- cộng thêm cờ đánh dấu "đã xuất" từng loại để cảnh báo trước khi đổi mã
-- (đổi mã sau khi đã xuất/in sẽ làm tem cũ không còn dùng được).
--
-- NULL (dữ liệu cũ trước migration này) được code coi là "đang bật" — giữ
-- đúng hành vi cũ (QR/mã vạch luôn hiện khi trang công khai đang bật).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists trace_qr_enabled boolean;
alter table public.batch_info add column if not exists trace_barcode_enabled boolean;
alter table public.batch_info add column if not exists trace_qr_exported boolean default false;
alter table public.batch_info add column if not exists trace_barcode_exported boolean default false;
