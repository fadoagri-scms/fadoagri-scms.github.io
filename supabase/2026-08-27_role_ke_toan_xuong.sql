-- Thêm role mới "Kế toán xưởng" (ke_toan_xuong) vào hệ thống 5 role hiện có
-- (admin, san_xuat, ncc, qc, xuat_khau) — dùng cho nhân sự theo dõi số
-- liệu/chi phí ở Xưởng Ba Phi.
--
-- Mặc định KHÔNG có quyền ghi ở module nào (giống mọi role mới thêm sau) —
-- Admin tự cấp quyền cho role này trong Tab Quản lý tài khoản → Ma trận
-- phân quyền sau khi chạy file này.
--
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- An toàn chạy nhiều lần.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'san_xuat', 'ncc', 'qc', 'xuat_khau', 'ke_toan_xuong'));

alter table public.module_permissions drop constraint if exists module_permissions_role_check;
alter table public.module_permissions add constraint module_permissions_role_check
  check (role in ('san_xuat', 'ncc', 'qc', 'xuat_khau', 'ke_toan_xuong'));
