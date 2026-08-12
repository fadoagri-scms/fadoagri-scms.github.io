-- Module "Đơn hàng" — ghi nhận đơn đã chốt với khách NGAY từ đầu (trước khi
-- có nguyên liệu), để Vùng nguyên liệu/Nhà cung cấp thấy trước mà chuẩn bị,
-- thay vì chỉ biết khi ai đó đã bắt đầu nhập nguyên liệu.
--
-- Mở rộng bảng batch_info sẵn có (đã dùng cho Hình thức/Trạng thái đóng
-- hàng ở module Đánh giá chất lượng) — không tạo bảng mới, cùng 1 nguồn cho
-- 1 lô hàng. Chỉ Admin thêm/sửa (kiểm soát ở UI — RLS admin vốn đã có toàn
-- quyền ghi trên bảng này, xem 2026-07-22_dynamic_permissions.sql).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.batch_info add column if not exists khach_hang text;
alter table public.batch_info add column if not exists san_pham text;
alter table public.batch_info add column if not exists so_luong_du_kien text;
alter table public.batch_info add column if not exists ngay_giao_mong_muon date;
