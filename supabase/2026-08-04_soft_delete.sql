-- Xóa mềm (soft-delete) cho các bảng có nút xóa trên dashboard — bấm xóa
-- không còn mất dữ liệu vĩnh viễn, chỉ đánh dấu deleted_at rồi ẩn khỏi danh
-- sách; ứng dụng cho phép "Hoàn tác" trong vài giây ngay sau khi xóa (xem
-- confirmDialog/showUndoToast trong app.js).
--
-- Không cần thêm policy RLS mới: quyền UPDATE (update deleted_at) đã có sẵn
-- và đúng đối tượng — cùng policy "role_update"/"Chỉ admin sửa profiles" vốn
-- đã dùng để kiểm soát ai được sửa/xóa dòng đó (xem
-- 2026-07-22_dynamic_permissions.sql và 2026-07-21_auth_roles.sql).
--
-- Cách dùng: dán vào Supabase Dashboard -> SQL Editor -> Run (chạy 1 lần).
-- An toàn chạy nhiều lần (idempotent).

alter table public.suppliers add column if not exists deleted_at timestamptz;
alter table public.purchase_orders add column if not exists deleted_at timestamptz;
alter table public.shipments add column if not exists deleted_at timestamptz;
alter table public.factory_staff add column if not exists deleted_at timestamptz;
alter table public.raw_batches add column if not exists deleted_at timestamptz;
alter table public.qc_checks add column if not exists deleted_at timestamptz;
alter table public.feedbacks add column if not exists deleted_at timestamptz;
alter table public.factory_finished_stock add column if not exists deleted_at timestamptz;

-- profiles: xóa dòng profiles vốn chỉ gỡ VAI TRÒ khỏi người đó (không đụng
-- tới tài khoản đăng nhập auth.users thật — xem 2026-07-22_fix_profiles_delete.sql),
-- nên xóa mềm ở đây an toàn: hoàn tác = gán lại đúng vai trò cũ ngay lập tức.
alter table public.profiles add column if not exists deleted_at timestamptz;
