-- 1) Xóa dòng dữ liệu test còn sót lại trong Vùng nguyên liệu
delete from public.raw_batches where id = 5 and ncc = 'Supabase Test NCC';

-- 2) Bảng raw_batches được tạo trước khi có schema.sql nên còn thiếu chính
-- sách RLS cho phép xóa (chỉ có đọc/thêm/sửa) — thêm cho đồng bộ với các
-- bảng khác, để sau này xóa được qua API/form nếu cần.
alter table public.raw_batches enable row level security;
drop policy if exists "Public full access" on public.raw_batches;
create policy "Public full access" on public.raw_batches for all using (true) with check (true);
