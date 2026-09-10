-- "Khóa sổ" lô đã hoàn tất — tránh lỡ tay sửa số liệu lịch sử của lô đã
-- giao xong (làm lệch báo cáo đã gửi lãnh đạo).
--
-- batch_info.lock_state:
--   NULL       — theo mặc định: lô TỰ KHÓA khi giai đoạn Logistics =
--                "Khách đã nhận hàng" VÀ đủ 4 chứng từ (app tự suy ra).
--   'unlocked' — admin đã mở khóa lô này để sửa (bỏ qua tự khóa).
--   'locked'   — admin khóa sớm thủ công (kể cả khi chưa giao xong).
--
-- App ẩn nút Sửa/Xóa của lô bị khóa với người KHÔNG phải admin (khóa ở mức
-- giao diện). Chặn triệt để ở tầng RLS sẽ làm riêng đợt sau nếu cần.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán cả file → Run. An toàn
-- chạy nhiều lần.

alter table public.batch_info add column if not exists lock_state text
  check (lock_state in ('locked', 'unlocked'));
alter table public.batch_info add column if not exists lock_changed_at timestamptz;
alter table public.batch_info add column if not exists lock_changed_by text;

notify pgrst, 'reload schema';
