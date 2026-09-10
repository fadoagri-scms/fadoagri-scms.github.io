-- Đổi tên (mã) 1 lô hàng an toàn — mã lô được tham chiếu bằng TEXT ở 13 bảng
-- và KHÔNG có cascade rename, nên đổi tay là chắc chắn bỏ sót, làm lô "mồ côi".
-- 2 hàm dưới đây chạy nguyên khối trong 1 transaction: lỗi giữa chừng thì
-- Postgres tự hủy hết, không để lô ở trạng thái nửa đổi.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán cả file → Run. An toàn
-- chạy nhiều lần. Sau khi chạy, tab "Quản lý tài khoản" (admin) sẽ có mục
-- "Đổi tên mã lô".

-- ===== 1) Xem trước: mã cũ đang xuất hiện ở đâu, bao nhiêu dòng =====
create or replace function public.rename_batch_preview(old_code text)
returns table(tbl text, n bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() is distinct from 'admin' then
    raise exception 'Chỉ admin được dùng chức năng này';
  end if;
  old_code := btrim(old_code);
  return query
              select 'Vùng nguyên liệu (raw_batches)'::text,        count(*) from raw_batches            where batch = old_code
    union all select 'Đơn đặt hàng NCC (purchase_orders)',           count(*) from purchase_orders        where batch_code = old_code
    union all select 'Đợt sản xuất (factory_batches)',               count(*) from factory_batches        where batch_code = old_code
    union all select 'Kết quả QC (qc_checks)',                       count(*) from qc_checks              where batch_code = old_code
    union all select 'Phân công QC (qc_assignments)',                count(*) from qc_assignments         where batch_code = old_code
    union all select 'Logistics (shipments)',                        count(*) from shipments              where batch_code = old_code
    union all select 'Checklist chứng từ (documents_checklist)',     count(*) from documents_checklist    where batch_code = old_code
    union all select 'Phản hồi khách hàng (feedbacks)',              count(*) from feedbacks              where batch_code = old_code
    union all select 'Tồn kho thành phẩm (factory_finished_stock)',  count(*) from factory_finished_stock where batch = old_code
    union all select 'Thông tin lô / đơn (batch_info)',              count(*) from batch_info             where batch = old_code
    union all select 'Sản phẩm dự kiến (batch_info_products)',       count(*) from batch_info_products    where batch = old_code
    union all select 'Truy xuất công khai (batch_trace_products)',   count(*) from batch_trace_products   where batch = old_code
    union all select 'Xử lý tồn/rớt — lô nguồn (factory_culled_processing)', count(*) from factory_culled_processing where source_batch = old_code
    union all select 'Xử lý tồn/rớt — lô đích (factory_culled_processing)',  count(*) from factory_culled_processing where target_batch = old_code;
end;
$$;

-- ===== 2) Đổi tên thật — nguyên khối =====
create or replace function public.rename_batch(old_code text, new_code text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  changed bigint := 0;
  tmp bigint;
begin
  if public.current_role() is distinct from 'admin' then
    raise exception 'Chỉ admin được đổi tên lô';
  end if;
  old_code := btrim(old_code);
  new_code := btrim(new_code);
  if old_code = '' or new_code = '' then
    raise exception 'Mã lô cũ và mã lô mới đều không được để trống';
  end if;
  if old_code = new_code then
    raise exception 'Mã mới trùng mã cũ';
  end if;
  -- Chặn gộp nhầm 2 lô: mã mới đã có dữ liệu ở một trong các "sổ cái" chính.
  if exists(select 1 from raw_batches     where batch = new_code)
     or exists(select 1 from batch_info   where batch = new_code)
     or exists(select 1 from purchase_orders where batch_code = new_code)
     or exists(select 1 from shipments    where batch_code = new_code)
     or exists(select 1 from factory_batches where batch_code = new_code) then
    raise exception 'Mã lô "%" đã tồn tại — chọn mã khác để tránh gộp nhầm 2 lô', new_code;
  end if;

  update raw_batches            set batch = new_code       where batch = old_code;       get diagnostics tmp = row_count; changed := changed + tmp;
  update purchase_orders        set batch_code = new_code  where batch_code = old_code;  get diagnostics tmp = row_count; changed := changed + tmp;
  update factory_batches        set batch_code = new_code  where batch_code = old_code;  get diagnostics tmp = row_count; changed := changed + tmp;
  update qc_checks              set batch_code = new_code  where batch_code = old_code;  get diagnostics tmp = row_count; changed := changed + tmp;
  update qc_assignments         set batch_code = new_code  where batch_code = old_code;  get diagnostics tmp = row_count; changed := changed + tmp;
  update shipments              set batch_code = new_code  where batch_code = old_code;  get diagnostics tmp = row_count; changed := changed + tmp;
  update documents_checklist    set batch_code = new_code  where batch_code = old_code;  get diagnostics tmp = row_count; changed := changed + tmp;
  update feedbacks              set batch_code = new_code  where batch_code = old_code;  get diagnostics tmp = row_count; changed := changed + tmp;
  update factory_finished_stock set batch = new_code       where batch = old_code;       get diagnostics tmp = row_count; changed := changed + tmp;
  update batch_info             set batch = new_code       where batch = old_code;       get diagnostics tmp = row_count; changed := changed + tmp;
  update batch_info_products    set batch = new_code       where batch = old_code;       get diagnostics tmp = row_count; changed := changed + tmp;
  update batch_trace_products   set batch = new_code       where batch = old_code;       get diagnostics tmp = row_count; changed := changed + tmp;
  update factory_culled_processing set source_batch = new_code where source_batch = old_code; get diagnostics tmp = row_count; changed := changed + tmp;
  update factory_culled_processing set target_batch = new_code where target_batch = old_code; get diagnostics tmp = row_count; changed := changed + tmp;

  return changed;
end;
$$;

grant execute on function public.rename_batch_preview(text) to authenticated;
grant execute on function public.rename_batch(text, text) to authenticated;

notify pgrst, 'reload schema';
