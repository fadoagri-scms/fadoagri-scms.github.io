-- Dọn các dòng lô sản xuất bị trùng batch_code (do trước đây mỗi lô có nhiều
-- dòng theo dõi công đoạn/tiến độ riêng — giờ module chỉ hiện 1 dòng/lô nên
-- các dòng trùng gây hiểu nhầm là dữ liệu sai). Giữ lại dòng có tiến độ cao
-- nhất (gần hoàn tất nhất) cho mỗi lô, xóa các dòng còn lại.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run. Chạy 1 lần.

delete from public.factory_batches
where id in (
  select id from (
    select id,
           row_number() over (
             partition by batch_code
             order by progress_pct desc nulls last, created_at desc, id desc
           ) as rn
    from public.factory_batches
  ) ranked
  where rn > 1
);

-- Thêm ràng buộc unique để từ nay không thể tạo 2 dòng cùng 1 lô hàng nữa
-- (an toàn chạy lại nhiều lần).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'factory_batches'
      and constraint_name = 'factory_batches_batch_code_key'
  ) then
    alter table public.factory_batches add constraint factory_batches_batch_code_key unique (batch_code);
  end if;
end $$;
