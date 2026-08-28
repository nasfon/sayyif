-- ============================================================================
-- IMS — Promote an existing Supabase auth user to super_admin
--
-- Run this in the Supabase SQL Editor (it executes as the admin role and
-- bypasses RLS). Edit the email below to match the auth account you created,
-- then run once. Idempotent: re-running just ensures the role stays super_admin.
--
-- After this, log in with that account to get full access.
-- ============================================================================

do $$
declare
  v_email   text := 'your-email@example.com';  -- <-- CHANGE THIS
  v_role_id uuid;
  v_user_id uuid;
begin
  select id into v_role_id from public.roles where name = 'super_admin';
  if v_role_id is null then
    raise exception 'super_admin role missing — apply migrations first';
  end if;

  select id into v_user_id from auth.users where email = lower(btrim(v_email));
  if v_user_id is null then
    raise exception 'no auth user with email %', v_email;
  end if;

  insert into public.users (id, shop_id, role_id, full_name, email)
  values (
    v_user_id,
    null,
    v_role_id,
    coalesce((select raw_user_meta_data->>'full_name' from auth.users where id = v_user_id), v_email),
    v_email
  )
  on conflict (id) do update
    set role_id = excluded.role_id,
        shop_id = null;

  raise notice 'user % is now super_admin', v_email;
end $$;
