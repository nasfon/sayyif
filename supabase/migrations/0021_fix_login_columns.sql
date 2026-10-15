-- ============================================================================
-- IMS — Fix login for RPC-created users (complete, GoTrue v2.195.0)
--
-- GoTrue's `models.User` (v2.195.0) scans these auth.users columns into plain
-- Go strings (NOT sql.NullString), so a SQL NULL makes the password grant fail
-- with `500 - Database error querying schema`:
--   confirmation_token, recovery_token, email_change, email_change_token_new
--
-- The function in the DB (migration 0017 as applied) only wrote confirmation_token
-- and recovery_token, leaving email_change and email_change_token_new as NULL for
-- every user it created. This migration:
--   1. Recreates admin_create_user so NEW users get every required column.
--   2. Repairs EXISTING users whose token/change columns are still NULL.
--
-- Note: GoTrue v2.195.0 looks users up with `instance_id = uuid.Nil`, so the
-- instance_id is pinned to 00000000-0000-0000-0000-000000000000.
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
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
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
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current,
    email_change_confirm_status, phone_change, phone_change_token,
    reauthentication_token
  )
  values (
    v_instance_id,
    v_user_id, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf', 10)), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name, 'email_verified', true),
    now(), now(),
    '', '', '', '', '', 0, '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(), v_user_id, v_user_id, 'email',
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    now(), now(), now()
  );

  insert into public.users (id, shop_id, role_id, full_name, email, phone)
  values (v_user_id, p_shop_id, v_role_id, p_full_name, v_email, p_phone);

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (p_shop_id, v_caller, 'user_created', 'user', v_user_id);

  return v_user_id;
end $$;

comment on function public.admin_create_user(text, text, text, text, text, uuid) is
  'Creates an auth account (email + password, bcrypt-hashed, pre-confirmed) and its public.users profile with role/shop. Writes a GoTrue v2.195.0-compatible auth.users/auth.identities row (all string token/change columns set to '''') so the account can sign in.';

-- ============================================================================
-- Repair existing users: clear any NULL token/change columns GoTrue scans as
-- plain strings. Safe to re-run.
-- ============================================================================

update auth.users
   set confirmation_token       = coalesce(confirmation_token, ''),
       recovery_token           = coalesce(recovery_token, ''),
       email_change             = coalesce(email_change, ''),
       email_change_token_new   = coalesce(email_change_token_new, ''),
       email_change_token_current = coalesce(email_change_token_current, ''),
       email_change_confirm_status = coalesce(email_change_confirm_status, 0),
       phone_change             = coalesce(phone_change, ''),
       phone_change_token       = coalesce(phone_change_token, ''),
       reauthentication_token   = coalesce(reauthentication_token, ''),
       email_confirmed_at       = coalesce(email_confirmed_at, created_at),
       instance_id              = coalesce(instance_id, '00000000-0000-0000-0000-000000000000'::uuid)
 where confirmation_token is null
    or recovery_token is null
    or email_change is null
    or email_change_token_new is null
    or email_change_token_current is null
    or email_change_confirm_status is null
    or phone_change is null
    or phone_change_token is null
    or reauthentication_token is null
    or email_confirmed_at is null
    or instance_id is null;

update auth.identities
   set identity_data = identity_data || '{"email_verified": true, "phone_verified": false}'::jsonb
 where provider = 'email'
   and (identity_data->>'email_verified' is null
        or identity_data->'email_verified' = 'false'::jsonb
        or identity_data->>'phone_verified' is null);
