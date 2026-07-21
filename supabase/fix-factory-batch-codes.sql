-- Gán lại 4 lô sản xuất demo cũ về đúng lô nguyên liệu THẬT đang có trong
-- Vùng nguyên liệu (raw_batches), để cột "Lô hàng" và "NCC" ở Xưởng Ba Phi
-- khớp dữ liệu xuyên suốt.
--
-- Cách dùng: Supabase Dashboard → SQL Editor → dán toàn bộ → Run. Chạy 1 lần.

update public.factory_batches set batch_code = 'DOUYIN - 06.26'    where batch_code = 'DUA-0716';
update public.factory_batches set batch_code = 'DOUYIN - 06.26'    where batch_code = 'DUA-0715B';
update public.factory_batches set batch_code = 'MINH NHÂN - 24.26' where batch_code = 'DUA-0715A';
update public.factory_batches set batch_code = 'MINH NHÂN - 24.26' where batch_code = 'DUA-0714';
