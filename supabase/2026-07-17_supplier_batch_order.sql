-- Module Nhà cung cấp:
--   - Đổi cột "PO đã giao" (đếm số PO, kiểu số) thành "Số ĐĐH" (mã đơn đặt
--     hàng dạng chữ, VD: '03.26'). Cột trong DB đổi tên po_delivered -> order_no
--     và đổi kiểu integer -> text.
--   - Thêm cột "Lô Hàng" (batch_code) — mã lô hàng, VD: 'MHR - 03.26'.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).

alter table public.suppliers add column if not exists batch_code text;

alter table public.suppliers rename column po_delivered to order_no;
alter table public.suppliers alter column order_no type text using order_no::text;
alter table public.suppliers alter column order_no drop default;
