-- Mở rộng ma trận phân quyền từ 2 trạng thái (✓ sửa được / Xem chỉ xem)
-- sang 3 trạng thái: thêm "— không thấy module" (ẩn hẳn tab đó khỏi sidebar
-- cho vai trò không có quyền).
--
-- QUAN TRỌNG: trạng thái "—" chỉ ẩn ở GIAO DIỆN (ẩn nav sidebar), KHÔNG khoá
-- SELECT thật ở RLS — vì nhiều module đọc chéo dữ liệu của nhau (Đánh giá
-- chất lượng đọc Vùng nguyên liệu/Nhà cung cấp/Xưởng Ba Phi; Tổng quan đọc
-- Đánh giá chất lượng/Logistics/Chứng từ/Feedback KH cho MỌI role, tab Tổng
-- quan không hề bị ẩn theo role) — khoá SELECT thật sẽ làm vỡ các màn hình
-- đó. Đã cân nhắc kỹ trước khi chọn hướng này.
--
-- Chạy SAU file 2026-07-22_dynamic_permissions.sql. An toàn chạy nhiều lần.

alter table public.module_permissions add column if not exists access_level text;

update public.module_permissions
set access_level = case when can_write then 'edit' else 'view' end
where access_level is null;

alter table public.module_permissions alter column access_level set default 'view';
alter table public.module_permissions alter column access_level set not null;

do $$
begin
  alter table public.module_permissions
    add constraint module_permissions_access_level_check
    check (access_level in ('edit','view','none'));
exception when duplicate_object then null;
end $$;

alter table public.module_permissions drop column if exists can_write;

-- can_write() giờ đọc access_level = 'edit' thay vì cột can_write cũ (đã xoá).
create or replace function public.can_write(p_module_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() = 'admin' or exists(
    select 1 from public.module_permissions
    where module_key = p_module_key
      and role = public.current_role()
      and access_level = 'edit'
  );
$$;
