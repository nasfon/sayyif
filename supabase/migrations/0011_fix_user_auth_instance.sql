-- ============================================================================
-- IMS — Fix login for RPC-created users
--
-- `admin_create_user` inserts directly into auth.users but omitted `instance_id`.
-- GoTrue filters auth lookups by `instance_id` (Supabase's default instance UUID),
-- so rows with a NULL instance_id are invisible to sign-in and return
-- "Invalid login credentials". This recreates the function with `instance_id` set
-- (derived from an existing, working auth account) so newly created users can sign in.
--
-- NOTE: This migration only touches the function (DDL). If you also need to repair
-- accounts that were already created with a NULL instance_id, run the separate
-- statement below in the SQL editor (or via the CLI):
--
--   update auth.users
--      set instance_id = (
--        select coalesce(
--          (select instance_id from auth.users where instance_id is not null limit 1),
--          '00000000-0000-0000-0000-000000000000'::uuid
--        )
--      )
--    where instance_id is null;
-- ============================================================================

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
  v_instance_id uuid := coalesce(
    (select instance_id from auth.users where instance_id is not null limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );
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
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  )
  values (
    v_instance_id,
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
  'Creates an auth account (email + password, bcrypt-hashed, pre-confirmed) and its public.users profile with role/shop. Sets instance_id so GoTrue can authenticate the account.';
