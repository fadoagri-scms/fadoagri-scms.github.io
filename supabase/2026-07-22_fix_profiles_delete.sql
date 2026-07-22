-- Sửa bug: bảng public.profiles (2026-07-21_auth_roles.sql) chỉ có policy
-- SELECT/UPDATE/INSERT, THIẾU policy DELETE — RLS mặc định chặn hết mọi
-- request không có policy phù hợp, nên nút xóa tài khoản ở màn "Quản lý tài
-- khoản" luôn báo lỗi, kể cả khi đăng nhập bằng admin.
--
-- Lưu ý: xóa dòng profiles chỉ gỡ VAI TRÒ khỏi người đó (họ sẽ bị app từ
-- chối với thông báo "chưa được gán vai trò" nếu đăng nhập lại) — KHÔNG xóa
-- được tài khoản auth.users thật (cần service_role, không có ở client-side).
-- Muốn xóa hẳn tài khoản đăng nhập, vào Supabase Dashboard → Authentication
-- → Users → xóa thủ công.
--
-- Chạy 1 lần trong Supabase SQL Editor. An toàn chạy nhiều lần.

drop policy if exists "Chỉ admin xóa profiles" on public.profiles;
create policy "Chỉ admin xóa profiles" on public.profiles
  for delete using (public.current_role() = 'admin');
