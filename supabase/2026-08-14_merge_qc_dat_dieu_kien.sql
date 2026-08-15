-- Gộp "Đạt có điều kiện" vào "Đạt" — 2 trạng thái này vốn đã được tính %
-- đạt giống hệt nhau trong mọi công thức thống kê, chỉ khác màu badge hiển
-- thị, nên gộp lại cho gọn (theo yêu cầu). Cập nhật dữ liệu CŨ để khớp với
-- danh sách lựa chọn mới — nếu không, các dòng cũ ghi "Đạt có điều kiện" sẽ
-- không khớp badge nào (hiện xám) và không còn được tính là đạt trong % nữa.
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần.

update public.qc_checks set result = 'Đạt' where result = 'Đạt có điều kiện';
