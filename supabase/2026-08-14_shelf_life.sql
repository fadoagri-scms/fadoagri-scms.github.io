-- Hạn sử dụng (số ngày) cho từng dòng Quy cách ở Xưởng sản xuất — dùng để
-- tính "Còn lại: X ngày" và sắp xếp tab Tồn kho theo FEFO (First Expired,
-- First Out — hàng sắp hết hạn xuất trước). Hạn sử dụng gắn với TỪNG
-- sản phẩm+quy cách (khác sản phẩm có thể khác hạn dùng), không gắn với cả
-- lô — khớp với cách chứng từ PI thật của công ty ghi (VD: "Dừa gọt hai
-- đầu" 50 ngày, "Dừa trọc chóp" 30 ngày, "Dừa kim cương" 60 ngày).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.factory_batch_boxes add column if not exists han_su_dung_ngay integer;
