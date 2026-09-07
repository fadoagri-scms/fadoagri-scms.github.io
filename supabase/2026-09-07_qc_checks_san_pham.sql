-- Đánh giá chất lượng: gắn kết quả kiểm theo SẢN PHẨM THÀNH PHẨM (đầu ra
-- Xưởng Ba Phi) thay vì theo chủng loại dừa (nguyên liệu đầu vào).
--
-- Lý do: QC kiểm thành phẩm trước khi xuất, không kiểm lại chủng loại
-- (việc đó đã làm ở Vùng nguyên liệu). 1 lô có thể ra nhiều sản phẩm khác
-- nhau (VD "Dừa gọt trọc" + "Dừa sáp lột vỏ") — mỗi sản phẩm cần tỷ lệ đạt
-- riêng, nên khóa kết quả theo tên sản phẩm.
--
-- Cột chung_loai GIỮ NGUYÊN (lịch sử kiểm cũ + trang truy xuất vẫn đọc);
-- chỉ thêm cột san_pham, từ nay bản ghi mới ghi vào đây.
--
-- Không backfill: các lượt kiểm cũ (san_pham null) vẫn hiện ở dòng chưa
-- tách sản phẩm; lượt kiểm thuộc 1 sản phẩm cụ thể thì nhập lại trong lúc
-- chạy thử.
--
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- An toàn chạy nhiều lần.

alter table public.qc_checks add column if not exists san_pham text;
