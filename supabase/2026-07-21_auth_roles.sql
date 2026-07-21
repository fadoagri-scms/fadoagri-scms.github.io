-- Đăng nhập + phân quyền theo module (FADO AGRI)
--
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- An toàn chạy nhiều lần (drop policy if exists trước mỗi create).
--
-- SAU KHI CHẠY FILE NÀY, bạn cần tự làm thêm (không thể làm từ code client):
--   1. Authentication → Providers → bật "Email" nếu chưa bật.
--   2. Authentication → Users → Add user → nhập email/mật khẩu cho tài khoản admin đầu tiên.
--   3. Copy "User UID" của tài khoản vừa tạo, rồi chạy:
--        insert into public.profiles (id, email, full_name, role)
--        values ('<user-uid-vừa-copy>', '<email vừa tạo>', 'Tên bạn', 'admin');
--      (mẫu SQL này cũng có ở cuối file, đã comment sẵn)

-- ============ Bảng hồ sơ + vai trò người dùng ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null check (role in ('admin','san_xuat','ncc','qc','xuat_khau')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- Hàm lấy role của user đang đăng nhập — security definer để đọc được profiles
-- ngay cả khi policy của chính bảng profiles giới hạn, tránh đệ quy policy.
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Ai cũng đọc được hồ sơ CỦA CHÍNH MÌNH (để app biết role sau khi đăng nhập);
-- chỉ admin đọc được toàn bộ danh sách (màn Quản lý tài khoản).
drop policy if exists "Đọc profiles khi đã đăng nhập" on public.profiles;
drop policy if exists "Đọc profile của mình hoặc admin đọc hết" on public.profiles;
create policy "Đọc profile của mình hoặc admin đọc hết" on public.profiles
  for select using (id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "Chỉ admin sửa profiles" on public.profiles;
create policy "Chỉ admin sửa profiles" on public.profiles
  for update using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

drop policy if exists "Chỉ admin thêm profiles" on public.profiles;
create policy "Chỉ admin thêm profiles" on public.profiles
  for insert with check (public.current_role() = 'admin');

-- Đổi policy "Public full access" (cũ, mở hoàn toàn) trên 1 bảng sang bộ 4
-- policy mới: đọc = mọi người đã đăng nhập, ghi (thêm/sửa/xóa) = admin hoặc
-- đúng role sở hữu module. Gọi cho từng bảng bên dưới.
do $$
declare
  t text;
  owner_role text;
  pol record;
  tables_sx text[] := array['raw_batches','factory_batches','factory_finished_stock','factory_staff'];
  tables_ncc text[] := array['suppliers','purchase_orders'];
  tables_qc text[] := array['qc_checks','batch_info'];
  tables_xk text[] := array['shipments','documents_checklist','feedbacks'];
begin
  foreach t in array tables_sx loop
    owner_role := 'san_xuat';
    -- Xóa TOÀN BỘ policy đang có trên bảng này, bất kể tên gì — một vài bảng
    -- (VD: raw_batches) có từ trước schema.sql, policy cũ có thể không tên
    -- "Public full access" nên drop theo tên cố định sẽ bỏ sót, để lại policy
    -- mở cũ vẫn còn hiệu lực song song (RLS policy là OR với nhau).
    for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = t) loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy "role_select" on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "role_insert" on public.%I for insert with check (public.current_role() in (''admin'', %L))', t, owner_role);
    execute format('create policy "role_update" on public.%I for update using (public.current_role() in (''admin'', %L)) with check (public.current_role() in (''admin'', %L))', t, owner_role, owner_role);
    execute format('create policy "role_delete" on public.%I for delete using (public.current_role() in (''admin'', %L))', t, owner_role);
  end loop;

  foreach t in array tables_ncc loop
    owner_role := 'ncc';
    for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = t) loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy "role_select" on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "role_insert" on public.%I for insert with check (public.current_role() in (''admin'', %L))', t, owner_role);
    execute format('create policy "role_update" on public.%I for update using (public.current_role() in (''admin'', %L)) with check (public.current_role() in (''admin'', %L))', t, owner_role, owner_role);
    execute format('create policy "role_delete" on public.%I for delete using (public.current_role() in (''admin'', %L))', t, owner_role);
  end loop;

  foreach t in array tables_qc loop
    owner_role := 'qc';
    for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = t) loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy "role_select" on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "role_insert" on public.%I for insert with check (public.current_role() in (''admin'', %L))', t, owner_role);
    execute format('create policy "role_update" on public.%I for update using (public.current_role() in (''admin'', %L)) with check (public.current_role() in (''admin'', %L))', t, owner_role, owner_role);
    execute format('create policy "role_delete" on public.%I for delete using (public.current_role() in (''admin'', %L))', t, owner_role);
  end loop;

  foreach t in array tables_xk loop
    owner_role := 'xuat_khau';
    for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = t) loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy "role_select" on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "role_insert" on public.%I for insert with check (public.current_role() in (''admin'', %L))', t, owner_role);
    execute format('create policy "role_update" on public.%I for update using (public.current_role() in (''admin'', %L)) with check (public.current_role() in (''admin'', %L))', t, owner_role, owner_role);
    execute format('create policy "role_delete" on public.%I for delete using (public.current_role() in (''admin'', %L))', t, owner_role);
  end loop;
end $$;

-- ============ Mẫu SQL tạo tài khoản admin đầu tiên (điền UID + email thật rồi bỏ comment) ============
-- insert into public.profiles (id, email, full_name, role)
-- values ('<user-uid-vừa-copy-từ-Authentication>', '<email>', 'Tên bạn', 'admin');
