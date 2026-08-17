-- Phân biệt 2 dạng đơn "Nội địa" (sale_type = 'Nội địa'): đa số là bán cho
-- công ty thương mại/broker để họ tự xuất khẩu, số ít mới thật sự tiêu thụ
-- trong nước. Chỉ có nghĩa khi sale_type = 'Nội địa', để trống với đơn
-- Xuất khẩu. Đặt cùng bảng batch_info như sale_type vì cùng thuộc về lô
-- hàng, không phải theo từng đơn NCC/lần kiểm QC.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists domestic_type text;
-- 'Bán cho broker (họ tự xuất khẩu)' | 'Tiêu thụ nội địa (Việt Nam)'
