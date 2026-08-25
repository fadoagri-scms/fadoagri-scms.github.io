-- Đưa module "Thu mua & Bán chợ" vào đúng mô hình phân quyền động.
--
-- Trước đây (2026-08-19_thu_mua_ban_cho.sql) 5 bảng của module này được tạo
-- với policy "Public full access" using(true)/with check(true) — mở hoàn
-- toàn, không phân biệt đăng nhập hay role, khác hẳn 7 module còn lại. Hệ
-- quả: bất kỳ ai có anon key (vốn nằm sẵn trong mã nguồn client) đều đọc/
-- ghi/xóa được các bảng này mà không cần đăng nhập vào dashboard, và Admin
-- không có cách nào giới hạn quyền qua Ma trận phân quyền (Tab Quản lý tài
-- khoản) vì module này chưa từng có module_key.
--
-- File này áp đúng pattern các module khác (xem
-- 2026-07-22_dynamic_permissions.sql): đọc = mọi người đã đăng nhập, ghi
-- (thêm/sửa/xóa) = admin hoặc role được Admin cấp mức "Sửa" cho module
-- "thu_mua_ban_cho" trong Ma trận phân quyền. Vì chưa có dòng nào trong
-- module_permissions cho module_key này, mặc định KHÔNG role nào (ngoài
-- admin) ghi được cho tới khi Admin tự cấp trong Tab Quản lý tài khoản —
-- an toàn hơn nhiều so với để mặc định mở như hiện tại.
--
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- An toàn chạy nhiều lần.

do $$
declare
  t text;
  pol record;
  tables_thumua text[] := array[
    'market_purchases',
    'market_processing',
    'market_processing_sources',
    'market_processing_outputs',
    'market_sales'
  ];
begin
  foreach t in array tables_thumua loop
    for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = t) loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format('create policy "role_select" on public.%I for select using (auth.role() = ''authenticated'')', t);
    execute format('create policy "role_insert" on public.%I for insert with check (public.can_write(''thu_mua_ban_cho''))', t);
    execute format('create policy "role_update" on public.%I for update using (public.can_write(''thu_mua_ban_cho'')) with check (public.can_write(''thu_mua_ban_cho''))', t);
    execute format('create policy "role_delete" on public.%I for delete using (public.can_write(''thu_mua_ban_cho''))', t);
  end loop;
end $$;
