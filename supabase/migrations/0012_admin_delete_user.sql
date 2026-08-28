-- ----------------------------------------------------------------------------
-- admin_delete_user — soft-delete a user account
-- ----------------------------------------------------------------------------

create or replace function public.admin_delete_user(p_user_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_caller   uuid := auth.uid();
  v_role     text;
  v_shop_id  uuid;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;

  if v_caller = p_user_id then
    raise exception 'cannot_delete_self';
  end if;

  select r.name, u.shop_id
    into v_role, v_shop_id
    from public.users u
    join public.roles r on r.id = u.role_id
   where u.id = p_user_id
     and u.deleted_at is null;

  if not found then
    raise exception 'user_not_found';
  end if;

  if v_role = 'super_admin' then
    raise exception 'cannot_delete_super_admin';
  end if;

  perform public.validate_user_scope(v_role, v_shop_id, v_shop_id, v_role);

  update public.users
     set deleted_at = now(),
         is_active  = false,
         updated_at = now()
   where id = p_user_id;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (v_shop_id, v_caller, 'user_deleted', 'user', p_user_id);
end $$;

comment on function public.admin_delete_user(uuid) is
  'Soft-deletes a user (sets deleted_at and is_active=false). Super admins can never be deleted, and a user cannot delete their own account. Shop admins are limited to their own shop.';

revoke execute on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
