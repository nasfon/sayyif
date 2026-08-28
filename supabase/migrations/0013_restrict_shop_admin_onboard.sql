-- ----------------------------------------------------------------------------
-- Restrict shop-admin creation: a shop admin may not onboard another shop admin.
-- Only the super admin can assign the shop_admin role. (Create flow is enforced
-- in the admin-create-user Edge Function; this covers the onboard path.)
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

  if p_role_name = 'shop_admin' and public.auth_role_name() = 'shop_admin' then
    raise exception 'role_forbidden';
  end if;

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
  'Assigns role/shop to an existing auth account by creating its public.users profile. Shop admins cannot assign the shop_admin role.';
