-- Dọn dẹp 1 lần: xoá các dòng dữ liệu mẫu bị nhân đôi do chạy lại schema.sql
-- (bản cũ dùng "on conflict do nothing" nhưng các bảng không có ràng buộc
-- unique nên không chặn được trùng lặp). Chỉ xoá dòng trùng y hệt nội dung
-- với 1 dòng khác có id nhỏ hơn — không đụng tới dữ liệu bạn tự nhập qua form.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- Chạy 1 lần là đủ; từ nay schema.sql đã an toàn để chạy lại nhiều lần.

-- ---- Xưởng Ba Phi: Sản xuất (4 dòng cũ chưa có order_code) ----
delete from public.factory_batches
where order_code is null
  and batch_code in ('DUA-0716', 'DUA-0715B', 'DUA-0715A', 'DUA-0714');

-- ---- Nhà cung cấp: Đơn đặt hàng ----
delete from public.purchase_orders a
using public.purchase_orders b
where a.id > b.id
  and a.batch_code is not distinct from b.batch_code
  and a.po_code is not distinct from b.po_code
  and a.supplier_name is not distinct from b.supplier_name
  and a.category is not distinct from b.category
  and a.type is not distinct from b.type
  and a.quantity is not distinct from b.quantity
  and a.status is not distinct from b.status;

-- ---- Đánh giá chất lượng ----
delete from public.qc_checks a
using public.qc_checks b
where a.id > b.id
  and a.batch_code is not distinct from b.batch_code
  and a.check_type is not distinct from b.check_type
  and a.result is not distinct from b.result
  and a.inspector is not distinct from b.inspector
  and a.note is not distinct from b.note;

-- ---- Logistics ----
delete from public.shipments a
using public.shipments b
where a.id > b.id
  and a.batch_code is not distinct from b.batch_code
  and a.category is not distinct from b.category
  and a.stage is not distinct from b.stage
  and a.location is not distinct from b.location
  and a.eta is not distinct from b.eta
  and a.is_featured is not distinct from b.is_featured;

-- ---- Chứng từ ----
delete from public.documents_checklist a
using public.documents_checklist b
where a.id > b.id
  and a.batch_code is not distinct from b.batch_code
  and a.market is not distinct from b.market
  and a.contract_ok is not distinct from b.contract_ok
  and a.co_ok is not distinct from b.co_ok
  and a.quarantine_ok is not distinct from b.quarantine_ok
  and a.bill_of_lading_ok is not distinct from b.bill_of_lading_ok
  and a.deadline is not distinct from b.deadline;

-- ---- Feedback KH ----
delete from public.feedbacks a
using public.feedbacks b
where a.id > b.id
  and a.batch_code is not distinct from b.batch_code
  and a.market is not distinct from b.market
  and a.rating is not distinct from b.rating
  and a.feedback_text is not distinct from b.feedback_text
  and a.status is not distinct from b.status;
