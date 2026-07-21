-- Tái cấu trúc module Nhà cung cấp:
--   - Bảng "suppliers": bỏ batch_code/order_no (dời qua purchase_orders vì
--     chi tiết lô hàng/đơn hàng thuộc về từng PO, không phải NCC). Thêm cột
--     "suggestion" (Đề xuất đặt hàng cho lô tiếp theo).
--   - Bảng "purchase_orders": thêm "batch_code" (Lô hàng) và "quantity"
--     (Số lượng đặt, text để cho phép ghi kèm đơn vị VD: '2.500 trái').
--     po_code giờ dùng làm "Số ĐĐH" (VD: '03.26') thay vì mã PO nội bộ.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần,
-- an toàn chạy lại nhiều lần).

alter table public.suppliers drop column if exists batch_code;
alter table public.suppliers drop column if exists order_no;
alter table public.suppliers add column if not exists suggestion text;

alter table public.purchase_orders add column if not exists batch_code text;
alter table public.purchase_orders add column if not exists quantity text;
