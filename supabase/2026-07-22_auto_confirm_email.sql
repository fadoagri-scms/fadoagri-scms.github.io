-- Tự động xác nhận email ngay khi tài khoản mới được tạo (qua nút "Thêm tài
-- khoản" trong app, dùng auth.signUp()) — không cần người dùng bấm link
-- xác nhận trong email mới đăng nhập được.
--
-- Lý do cần: giao diện "Confirm email" trong Supabase Dashboard (Authentication
-- → Sign In / Providers → Email) đã không còn tìm thấy ở bản Dashboard hiện
-- tại của dự án này — dùng trigger ở tầng database để không phụ thuộc việc
-- tìm đúng nút đó nữa. An toàn với mô hình hiện tại vì tài khoản chỉ được
-- tạo qua nút "Thêm tài khoản" (chỉ Admin dùng được) — dù có ai gọi thẳng
-- API signUp() từ bên ngoài, tài khoản đó vẫn KHÔNG có dòng trong
-- public.profiles (chỉ Admin thêm được, xem 2026-07-21_auth_roles.sql) nên
-- vẫn bị app từ chối đăng nhập với thông báo "chưa được gán vai trò".
--
-- Chạy 1 lần trong Supabase SQL Editor. An toàn chạy nhiều lần.

create or replace function public.auto_confirm_email()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_confirm_email on auth.users;
create trigger trg_auto_confirm_email
before insert on auth.users
for each row execute function public.auto_confirm_email();

-- Xác nhận luôn các tài khoản cũ (nếu còn sót) đang bị kẹt vì lý do này.
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;
