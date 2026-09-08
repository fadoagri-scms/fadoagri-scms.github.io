-- Tách rõ phần "còn lại" của mỗi lượt sản xuất ở Xưởng Ba Phi thành 2 nhóm
-- nhập tay + 1 nhóm hệ thống tự tính, thay vì gộp hết vào "Rớt/chưa đạt chuẩn"
-- (trước đây tự tính = Nhập − Thành phẩm − Dạt bỏ, nuốt chung cả hàng còn tốt
-- lẫn phần thất thoát nên nhìn vào không rõ là gì):
--
--   Số lượng nhập = Thành phẩm + Dạt/bỏ + Rớt chuẩn + Tồn NL chưa SX + Thất thoát
--
--   - rot_chuan_qty  — "Rớt / chưa đạt chuẩn" (trái). TRƯỚC tự tính, GIỜ nhập
--                       tay lúc "Cập nhật sản xuất". Vẫn nối sang "Xử lý hàng
--                       tồn & rớt" ở Tồn kho (bán chợ/gán bù) như cũ, chỉ khác
--                       là lấy đúng số đã nhập thay vì suy ra.
--   - ton_nl_qty     — "Tồn nguyên liệu chưa SX" (trái). Ô MỚI. Trái còn tốt
--                       để lại đợt/ngày sau, KHÔNG tính vào hao hụt.
--   - "Thất thoát"      — không lưu cột riêng, luôn tự tính khi hiển thị:
--                       Nhập − Thành phẩm − Dạt bỏ − Rớt chuẩn − Tồn NL.
--   - "Hao hụt %"     — (Dạt bỏ + Thất thoát) ÷ Số lượng nhập.
--
-- Lô cũ chưa mở lại form để tách: rot_chuan_qty / ton_nl_qty = NULL → app tự
-- rơi về công thức cũ (Rớt chuẩn = Nhập − Thành phẩm − Dạt bỏ, Tồn NL = 0,
-- Thất thoát = 0) nên số liệu hiển thị y như trước cho tới khi được nhập lại.
-- Không cần backfill.
--
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_batches add column if not exists rot_chuan_qty numeric;
alter table public.factory_batches add column if not exists ton_nl_qty numeric;
