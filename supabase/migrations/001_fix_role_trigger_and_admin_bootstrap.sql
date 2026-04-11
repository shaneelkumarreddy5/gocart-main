-- ============================================================
-- Migration 001: Fix role-protection trigger + admin bootstrap
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Fix prevent_user_role_changes so the service_role (used by
--    server-side admin operations like vendor sign-up) can update
--    user roles without being blocked.
create or replace function public.prevent_user_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow service_role (server-side admin operations) to change roles freely.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if old.role is distinct from new.role and not private.is_admin() then
    raise exception 'Only admins can change roles.';
  end if;

  return new;
end;
$$;

-- 2. Bootstrap your admin account.
--    Run ONLY ONCE after you have signed up this account in Supabase Auth:
--    email: admin@glonni.com
--    password: Admin@1234
--
-- SET session_replication_role = replica;
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@glonni.com';
-- RESET session_replication_role;
--
-- After step 1 above is applied, you can instead just run:
-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@glonni.com';
-- (Uses service_role context from the SQL editor which bypasses the trigger via step 1)
