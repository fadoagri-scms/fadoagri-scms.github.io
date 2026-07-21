-- Ma trận phân quyền động (FADO AGRI)
--
-- Trước đây quyền ghi (thêm/sửa/xóa) của từng vai trò trên từng module bị
-- CỐ ĐỊNH trong policy SQL (2026-07-21_auth_roles.sql) — muốn đổi quyền phải
-- sửa code. File này thêm 1 bảng module_permissions để Admin bật/tắt quyền
-- ngay tại màn "Quản lý tài khoản" trên giao diện, và viết lại policy của
-- từng bảng để đọc quyền từ đó thay vì code cứng.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- Chạy SAU file 2026-07-21_auth_roles.sql (cần bảng profiles + hàm
-- current_role() đã có sẵn). An toàn chạy nhiều lần.

-- ============ Bảng lưu ma trận phân quyền ============
create table if not exists public.module_permissions (
  module_key text not null,
  role text not null check (role in ('san_xuat','ncc','qc','xuat_khau')),
  can_write boolean not null default false,
  primary key (module_key, role)
);
alter table public.module_permissions enable row level security;

drop policy if exists "Chỉ admin đọc ma trận quyền" on public.module_permissions;
create policy "Chỉ admin đọc ma trận quyền" on public.module_permissions
  for select using (public.current_role() = 'admin');

drop policy if exists "Chỉ admin sửa ma trận quyền" on public.module_permissions;
create policy "Chỉ admin sửa ma trận quyền" on public.module_permissions
  for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

-- Giá trị mặc định — khớp với phân quyền cố định trước đây, Admin đổi được
-- ngay sau khi chạy file này, không mất dữ liệu nếu chạy lại (on conflict).
insert into public.module_permissions (module_key, role, can_write) values
  ('vung_nguyen_lieu', 'san_xuat', true),
  ('vung_nguyen_lieu', 'ncc', false),
  ('vung_nguyen_lieu', 'qc', false),
  ('vung_nguyen_lieu', 'xuat_khau', false),

  ('nha_cung_cap', 'san_xuat', false),
  ('nha_cung_cap', 'ncc', true),
  ('nha_cung_cap', 'qc', false),
  ('nha_cung_cap', 'xuat_khau', false),

  ('xuong_ba_phi', 'san_xuat', true),
  ('xuong_ba_phi', 'ncc', false),
  ('xuong_ba_phi', 'qc', false),
  ('xuong_ba_phi', 'xuat_khau', false),

  ('danh_gia_chat_luong', 'san_xuat', false),
  ('danh_gia_chat_luong', 'ncc', false),
  ('danh_gia_chat_luong', 'qc', true),
  ('danh_gia_chat_luong', 'xuat_khau', false),

  ('logistics', 'san_xuat', false),
  ('logistics', 'ncc', false),
  ('logistics', 'qc', false),
  ('logistics', 'xuat_khau', true),

  ('chung_tu', 'san_xuat', false),
  ('chung_tu', 'ncc', false),
  ('chung_tu', 'qc', false),
  ('chung_tu', 'xuat_khau', true),

  ('feedback_kh', 'san_xuat', false),
  ('feedback_kh', 'ncc', false),
  ('feedback_kh', 'qc', false),
  ('feedback_kh', 'xuat_khau', true)
on conflict (module_key, role) do nothing;

-- ============ Hàm kiểm tra quyền ghi theo module (đọc bảng ở trên) ============
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
      and can_write = true
  );
$$;

-- ============ Viết lại policy ghi (insert/update/delete) từng bảng để dùng can_write() ============
-- select vẫn mở cho mọi user đã đăng nhập, không đổi (giữ kiến trúc hub-and-spoke).
do $$
declare
  rec record;
  pol record;
  map jsonb := '{
    "raw_batches": "vung_nguyen_lieu",
    "suppliers": "nha_cung_cap",
    "purchase_orders": "nha_cung_cap",
    "factory_batches": "xuong_ba_phi",
    "factory_finished_stock": "xuong_ba_phi",
    "factory_staff": "xuong_ba_phi",
    "qc_checks": "danh_gia_chat_luong",
    "batch_info": "danh_gia_chat_luong",
    "shipments": "logistics",
    "documents_checklist": "chung_tu",
    "feedbacks": "feedback_kh"
  }'::jsonb;
begin
  for rec in select key as t, value as m_key from jsonb_each_text(map) loop
    for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = rec.t) loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, rec.t);
    end loop;
    execute format('create policy "role_select" on public.%I for select using (auth.role() = ''authenticated'')', rec.t);
    execute format('create policy "role_insert" on public.%I for insert with check (public.can_write(%L))', rec.t, rec.m_key);
    execute format('create policy "role_update" on public.%I for update using (public.can_write(%L)) with check (public.can_write(%L))', rec.t, rec.m_key, rec.m_key);
    execute format('create policy "role_delete" on public.%I for delete using (public.can_write(%L))', rec.t, rec.m_key);
  end loop;
end $$;
