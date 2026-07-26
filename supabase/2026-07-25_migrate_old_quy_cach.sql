-- Tự động chuyển Quy cách cũ (factory_batches.quy_cach, 1 giá trị/đợt)
-- sang bảng factory_batch_boxes mới — khỏi phải nhập tay lại cho các đợt
-- sản xuất đã có Quy cách từ trước. Số lượng thùng tính lại đúng công thức
-- cũ: Thành phẩm ÷ Quy cách (làm tròn xuống).
--
-- An toàn chạy nhiều lần: chỉ chèn cho đợt nào CHƯA có dòng nào trong
-- factory_batch_boxes (không đè lên nếu bạn đã tự nhập breakdown mới).
--
-- Cách dùng: chạy SAU khi đã chạy file 2026-07-25_factory_batch_boxes.sql.
-- Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.

insert into public.factory_batch_boxes (factory_batch_id, quy_cach, so_luong_thung)
select fb.id, fb.quy_cach, floor(fb.finished_qty / fb.quy_cach)
from public.factory_batches fb
where fb.quy_cach is not null
  and fb.quy_cach > 0
  and fb.finished_qty is not null
  and not exists (
    select 1 from public.factory_batch_boxes b where b.factory_batch_id = fb.id
  );
