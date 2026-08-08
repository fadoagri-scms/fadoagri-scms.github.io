-- Nhà cung cấp: thêm "Ngày hẹn giao" + "Ngày giao thực tế" cho từng đơn đặt
-- hàng (purchase_orders) — để tính được Tỷ lệ giao đúng hẹn thật thay vì gõ
-- tay như trước, cùng cách đã làm cho raw_batches (2026-08-04).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

alter table public.purchase_orders add column if not exists ngay_hen_giao date;
alter table public.purchase_orders add column if not exists ngay_giao_thuc_te date;
