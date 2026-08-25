-- Chỉ Admin được sửa thông tin "Đơn hàng" (khách hàng, ngày giao mong muốn,
-- danh sách sản phẩm dự kiến) — đúng ý định gốc ("Chỉ Admin thêm/sửa (kiểm
-- soát ở UI)" trong 2026-08-05_don_hang.sql, nút "Thêm đơn hàng" trên UI
-- cũng chỉ hiện cho Admin), nhưng RLS thật lại cho phép role qc ghi được
-- qua API vì batch_info/batch_info_products dùng chung policy ghi với module
-- Đánh giá chất lượng (được thêm sau vào 2 bảng có sẵn).
--
-- Cách dùng: mở Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
-- An toàn chạy nhiều lần.

-- ============ 1) batch_info_products ============
-- Chỉ tab Đơn hàng ghi bảng này (QC không đụng tới, xem app.js — không có
-- lệnh insert/update/delete nào trên batch_info_products ngoài form "Thêm
-- đơn hàng") — thu hẹp policy ghi từ (admin, qc) xuống chỉ admin.
do $$
declare
  pol record;
begin
  for pol in (select policyname from pg_policies where schemaname = 'public' and tablename = 'batch_info_products') loop
    execute format('drop policy if exists %I on public.batch_info_products', pol.policyname);
  end loop;
  execute 'create policy "role_select" on public.batch_info_products for select using (auth.role() = ''authenticated'')';
  execute 'create policy "role_insert" on public.batch_info_products for insert with check (public.current_role() = ''admin'')';
  execute 'create policy "role_update" on public.batch_info_products for update using (public.current_role() = ''admin'') with check (public.current_role() = ''admin'')';
  execute 'create policy "role_delete" on public.batch_info_products for delete using (public.current_role() = ''admin'')';
end $$;

-- ============ 2) batch_info ============
-- batch_info trộn 2 nhóm cột chủ khác nhau: nhóm QC (sale_type,
-- domestic_type, order_status, note...) vẫn cần role qc ghi được, và nhóm
-- Đơn hàng (khach_hang, ngay_giao_mong_muon) chỉ Admin được ghi. RLS không
-- tách được theo cột trong 1 policy (chỉ tách theo dòng), nên dùng trigger:
-- nếu người ghi không phải admin, âm thầm giữ nguyên giá trị cũ của 2 cột
-- Đơn hàng — không báo lỗi, không ảnh hưởng phần ghi hợp lệ khác cùng lúc
-- (các hàm QC saveSaleType/saveDomesticType/saveOrderStatus trong app.js chỉ
-- upsert đúng 1-2 cột của riêng mình, không bao giờ gửi khach_hang/
-- ngay_giao_mong_muon nên không hề bị ảnh hưởng bởi trigger này).
create or replace function public.enforce_batch_info_order_fields()
returns trigger
language plpgsql
as $$
begin
  if public.current_role() <> 'admin' then
    if TG_OP = 'INSERT' then
      NEW.khach_hang := null;
      NEW.ngay_giao_mong_muon := null;
    else
      NEW.khach_hang := OLD.khach_hang;
      NEW.ngay_giao_mong_muon := OLD.ngay_giao_mong_muon;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_batch_info_order_fields on public.batch_info;
create trigger trg_batch_info_order_fields
before insert or update on public.batch_info
for each row execute function public.enforce_batch_info_order_fields();
