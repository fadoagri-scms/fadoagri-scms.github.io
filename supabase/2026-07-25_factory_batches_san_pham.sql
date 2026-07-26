-- Thêm "Sản phẩm" (tên thành phẩm cụ thể được chế biến ra, VD: từ chủng
-- loại Xiêm xanh chế biến ra "Dừa xiêm xanh nón lá") cho từng đợt sản
-- xuất — khác với Chủng loại (giống dừa thô đầu vào, lấy từ Vùng nguyên
-- liệu), đây là tên sản phẩm đầu ra sau chế biến.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ file → Run.
-- An toàn chạy nhiều lần.

alter table public.factory_batches add column if not exists san_pham text;
