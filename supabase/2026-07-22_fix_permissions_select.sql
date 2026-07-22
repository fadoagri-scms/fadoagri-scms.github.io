-- Sửa bug: policy SELECT của module_permissions đang chỉ cho Admin đọc,
-- khiến MỌI role khác (san_xuat/ncc/qc/xuat_khau) không đọc được ma trận
-- quyền của chính mình khi đăng nhập -> app mặc định coi mọi module là
-- "không có quyền" -> ẩn sạch mọi tab, chỉ còn Tổng quan (module đó không
-- bị ẩn theo role). Sửa lại: ai đã đăng nhập cũng đọc được (để biết quyền
-- của chính mình); chỉ Admin mới SỬA được (insert/update/delete giữ nguyên
-- như file 2026-07-22_dynamic_permissions.sql, không đổi).
--
-- Chạy 1 lần trong Supabase SQL Editor. An toàn chạy nhiều lần.

drop policy if exists "Chỉ admin đọc ma trận quyền" on public.module_permissions;
create policy "Mọi người đã đăng nhập đọc được ma trận quyền" on public.module_permissions
  for select using (auth.role() = 'authenticated');
