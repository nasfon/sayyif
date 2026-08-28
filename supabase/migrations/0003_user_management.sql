-- ============================================================================
-- IMS — User Onboarding & Role Assignment (MVP)
--
-- Admins (Super Admin / Shop Admin) manage users from the browser. Since the
-- client only holds the anon key, creating a login account must happen
-- server-side: these SECURITY DEFINER functions write directly to auth.users
-- + auth.identities (managed by GoTrue) and public.users in one transaction.
--
-- Every function validates the caller's role/shop, mirrors the scope rules in
-- docs/Security & RBAC Design.md, and writes an audit log in the same txn.
--
-- Invocation examples (run in the Supabase SQL editor as tests):
--   select public.admin_create_user('cashier@example.com','SecurePass1!','Jane Cashier',null,'cashier','<shop-id>');
--   select public.admin_onboard_user('<auth-user-id>','Jane Cashier',null,'cashier','<shop-id>');
--   select public.admin_update_user('<user-id>','Jane Cashier',null,'cashier','<shop-id>',true);
--   select public.admin_reset_password('<user-id>','NewPass1!');
--   select * from public.admin_list_unassigned_auth_users();
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Helpers shared by the admin functions
-- ----------------------------------------------------------------------------

create or replace function public.resolve_role_id(p_role_name text) returns uuid
  language sql stable set search_path = public as $$
  select id from public.roles where name = p_role_name
$$;

comment on function public.resolve_role_id(text) is
  'Resolves a role name (super_admin|shop_admin|cashier) to its roles.id.';

-- Validate that the caller may assign the requested role/shop, and that a
-- non-super-admin never touches a super admin or another shop's users.
--   p_target_shop / p_target_role describe the user being modified (for updates)
--   so the scope of the *target* is also checked, not just the new values.
create or replace function public.validate_user_scope(
  p_role_name text,
  p_shop_id uuid,
  p_target_shop uuid default null,
  p_target_role text default null
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_caller_shop uuid := public.auth_shop_id();
  v_caller_role text := public.auth_role_name();
begin
  if v_caller_role = 'super_admin' then
    if p_role_name = 'super_admin' and p_shop_id is not null then
      raise exception 'super_admin_cannot_have_shop';
    end if;
    return;
  end if;

  if v_caller_role = 'shop_admin' then
    if p_role_name = 'super_admin' then
      raise exception 'role_forbidden';
    end if;
    if p_shop_id is null then
      raise exception 'shop_required';
    end if;
    if p_shop_id is distinct from v_caller_shop then
      raise exception 'shop_mismatch';
    end if;
    if p_target_shop is not null and p_target_shop is distinct from v_caller_shop then
      raise exception 'shop_mismatch';
    end if;
    if p_target_role = 'super_admin' then
      raise exception 'role_forbidden';
    end if;
    return;
  end if;

  raise exception 'forbidden';
end $$;

comment on function public.validate_user_scope(text, uuid, uuid, text) is
  'Enforces role/shop assignment rules. Super admins are unrestricted; shop admins are limited to their own shop and may never assign or touch super admins; anyone else is forbidden.';

-- ----------------------------------------------------------------------------
-- admin_create_user — create auth account + profile in one transaction
-- ----------------------------------------------------------------------------

create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text default null,
  p_role_name text default 'cashier',
  p_shop_id uuid default null
) returns uuid
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_caller      uuid := auth.uid();
  v_user_id     uuid := gen_random_uuid();
  v_role_id     uuid;
  v_email       text := lower(btrim(p_email));
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'password_too_short';
  end if;
  if p_full_name is null or length(btrim(p_full_name)) = 0 then
    raise exception 'name_required';
  end if;
  if length(btrim(p_full_name)) > 100 then
    raise exception 'name_too_long';
  end if;
  if length(v_email) = 0 or length(v_email) > 254 then
    raise exception 'invalid_email';
  end if;
  if p_phone is not null and length(btrim(p_phone)) > 30 then
    raise exception 'phone_too_long';
  end if;

  v_role_id := public.resolve_role_id(p_role_name);
  if v_role_id is null then
    raise exception 'invalid_role';
  end if;

  if p_role_name = 'super_admin' then
    p_shop_id := null;
  elsif p_shop_id is null then
    raise exception 'shop_required';
  end if;

  perform public.validate_user_scope(p_role_name, p_shop_id);

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email_taken';
  end if;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values (
    v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name), now(), now()
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(), v_user_id, v_user_id, 'email',
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    now(), now(), now()
  );

  insert into public.users (id, shop_id, role_id, full_name, email, phone)
  values (v_user_id, p_shop_id, v_role_id, p_full_name, v_email, p_phone);

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (p_shop_id, v_caller, 'user_created', 'user', v_user_id);

  return v_user_id;
end $$;

comment on function public.admin_create_user(text, text, text, text, text, uuid) is
  'Creates an auth account (email + password, bcrypt-hashed, pre-confirmed) and its public.users profile with role/shop. Super Admins may assign any role; Shop Admins only their own shop and never Super Admin.';

-- ----------------------------------------------------------------------------
-- admin_onboard_user — create a public.users profile for an existing auth user
-- ----------------------------------------------------------------------------

create or replace function public.admin_onboard_user(
  p_user_id uuid,
  p_full_name text,
  p_phone text default null,
  p_role_name text default 'cashier',
  p_shop_id uuid default null
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_caller  uuid := auth.uid();
  v_role_id uuid;
  v_email   text;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_full_name is null or length(btrim(p_full_name)) = 0 then
    raise exception 'name_required';
  end if;
  if length(btrim(p_full_name)) > 100 then
    raise exception 'name_too_long';
  end if;
  if p_phone is not null and length(btrim(p_phone)) > 30 then
    raise exception 'phone_too_long';
  end if;

  v_role_id := public.resolve_role_id(p_role_name);
  if v_role_id is null then
    raise exception 'invalid_role';
  end if;

  if p_role_name = 'super_admin' then
    p_shop_id := null;
  elsif p_shop_id is null then
    raise exception 'shop_required';
  end if;

  perform public.validate_user_scope(p_role_name, p_shop_id);

  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then
    raise exception 'user_not_found';
  end if;

  -- A soft-deleted profile can be re-onboarded (this recreates it). To
  -- permanently block an account, deactivate it instead (is_active = false).
  if exists (select 1 from public.users where id = p_user_id and deleted_at is null) then
    raise exception 'already_onboarded';
  end if;

  insert into public.users (id, shop_id, role_id, full_name, email, phone)
  values (p_user_id, p_shop_id, v_role_id, btrim(p_full_name), v_email, p_phone);

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (p_shop_id, v_caller, 'user_onboarded', 'user', p_user_id);
end $$;

comment on function public.admin_onboard_user(uuid, text, text, text, uuid) is
  'Assigns role/shop to an existing auth account by creating its public.users profile (used for accounts that signed up without a role).';

-- ----------------------------------------------------------------------------
-- admin_update_user — role/shop reassignment, profile edit, activate/deactivate
-- ----------------------------------------------------------------------------

create or replace function public.admin_update_user(
  p_user_id uuid,
  p_full_name text default null,
  p_phone text default null,
  p_role_name text default null,
  p_shop_id uuid default null,
  p_is_active boolean default null
) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_caller      uuid := auth.uid();
  v_role_id     uuid;
  v_user        public.users;
  v_old_role    text;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_full_name is not null and (length(btrim(p_full_name)) = 0 or length(btrim(p_full_name)) > 100) then
    raise exception 'name_invalid';
  end if;
  if p_phone is not null and length(btrim(p_phone)) > 30 then
    raise exception 'phone_too_long';
  end if;

  select u.* into v_user
    from public.users u
   where u.id = p_user_id
     and u.deleted_at is null;
  if not found then
    raise exception 'user_not_found';
  end if;

  select r.name into v_old_role from public.roles r where r.id = v_user.role_id;

  if p_role_name is null then
    v_role_id := v_user.role_id;
    p_role_name := v_old_role;
  else
    v_role_id := public.resolve_role_id(p_role_name);
    if v_role_id is null then
      raise exception 'invalid_role';
    end if;
  end if;

  if p_role_name = 'super_admin' then
    p_shop_id := null;
  elsif p_shop_id is null then
    p_shop_id := v_user.shop_id;
  end if;

  if v_user.id = v_caller and (p_is_active is not null and not p_is_active) then
    raise exception 'cannot_deactivate_self';
  end if;

  -- Pass the target user's current shop and role so the scope check covers
  -- the existing record too, not just the incoming values.
  perform public.validate_user_scope(
    p_role_name, p_shop_id, v_user.shop_id, v_old_role
  );

  update public.users
     set full_name = coalesce(p_full_name, full_name),
         phone     = coalesce(p_phone, phone),
         role_id   = v_role_id,
         shop_id   = p_shop_id,
         is_active = coalesce(p_is_active, is_active)
   where id = p_user_id;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (v_user.shop_id, v_caller, 'user_updated', 'user', p_user_id);
end $$;

comment on function public.admin_update_user(uuid, text, text, text, uuid, boolean) is
  'Edits a user profile, reassigns role/shop, or activates/deactivates. Cannot be used to deactivate your own account or to touch users outside the caller''s scope.';

-- ----------------------------------------------------------------------------
-- admin_reset_password — set a new password for an existing auth user
-- ----------------------------------------------------------------------------

create or replace function public.admin_reset_password(
  p_user_id uuid,
  p_new_password text
) returns void
  language plpgsql security definer set search_path = public, extensions as $$
declare
  v_caller      uuid := auth.uid();
  v_user        public.users;
  v_target_role text;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'password_too_short';
  end if;

  select u.* into v_user
    from public.users u
   where u.id = p_user_id
     and u.deleted_at is null;
  if not found then
    raise exception 'user_not_found';
  end if;

  select r.name into v_target_role from public.roles r where r.id = v_user.role_id;

  -- The target role is passed as the requested role *and* as the target role so
  -- a shop admin cannot reset a super admin's password or a user in another shop.
  perform public.validate_user_scope(
    v_target_role, v_user.shop_id, v_user.shop_id, v_target_role
  );

  update auth.users
     set encrypted_password = crypt(p_new_password, gen_salt('bf', 10)),
         updated_at = now()
   where id = p_user_id;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (v_user.shop_id, v_caller, 'user_password_reset', 'user', p_user_id);
end $$;

comment on function public.admin_reset_password(uuid, text) is
  'Sets a new bcrypt-hashed password for an existing user. Scoped to the caller''s shop and role permissions.';

-- ----------------------------------------------------------------------------
-- admin_list_unassigned_auth_users — auth accounts waiting to be onboarded
-- ----------------------------------------------------------------------------

create or replace function public.admin_list_unassigned_auth_users()
returns table (id uuid, email text, created_at timestamptz)
  language plpgsql security definer set search_path = public as $$
begin
  if public.auth_role_name() not in ('super_admin', 'shop_admin') then
    raise exception 'forbidden';
  end if;
  return query
    select au.id, au.email, au.created_at
      from auth.users au
     where not exists (select 1 from public.users u where u.id = au.id)
     order by au.created_at asc;
end $$;

comment on function public.admin_list_unassigned_auth_users() is
  'Lists auth accounts that have no public.users profile yet (pending onboarding). Super Admins and Shop Admins only.';

revoke execute on function public.admin_create_user(text, text, text, text, text, uuid) from public;
revoke execute on function public.admin_onboard_user(uuid, text, text, text, uuid) from public;
revoke execute on function public.admin_update_user(uuid, text, text, text, uuid, boolean) from public;
revoke execute on function public.admin_reset_password(uuid, text) from public;
revoke execute on function public.admin_list_unassigned_auth_users() from public;

grant execute on function public.admin_create_user(text, text, text, text, text, uuid) to authenticated;
grant execute on function public.admin_onboard_user(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.admin_update_user(uuid, text, text, text, uuid, boolean) to authenticated;
grant execute on function public.admin_reset_password(uuid, text) to authenticated;
grant execute on function public.admin_list_unassigned_auth_users() to authenticated;

-- ----------------------------------------------------------------------------
-- Onboard the bootstrap super admin if their auth account already exists.
-- Idempotent: only applies when superadmin@ims.com has no public.users row.
-- ----------------------------------------------------------------------------

insert into public.users (id, shop_id, role_id, full_name, email)
select au.id, null, r.id, coalesce(au.raw_user_meta_data ->> 'full_name', au.email), au.email
  from auth.users au
  join public.roles r on r.name = 'super_admin'
 where au.email = 'superadmin@ims.com'
   and not exists (select 1 from public.users u where u.id = au.id);