-- ============================================================================
-- IMS — Credit summary (read-only aggregate RPC)
--
-- Serves the Credit Book page stats (total outstanding balance and count of
-- customers owing). Aggregates run in SQL per docs/Database Schema Guide.md
-- section 6; the client receives numbers, never a full customers table.
--
-- * Scoped to the caller's shop unless the caller is a super admin.
-- * Only counts active (non-soft-deleted) customers with a balance > 0.
-- ============================================================================

create or replace function public.credit_summary(
  p_shop_id uuid default null
) returns table (
  total_outstanding numeric(14, 2),
  customer_count    bigint
)
  language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_is_super_admin() then
    if p_shop_id is null then
      p_shop_id := public.auth_shop_id();
    elsif p_shop_id is distinct from public.auth_shop_id() then
      raise exception 'shop_mismatch';
    end if;
  end if;

  return query
    select coalesce(sum(c.total_credit), 0)::numeric(14, 2),
           count(*)::bigint
      from public.customers c
     where c.deleted_at is null
       and c.total_credit > 0
       and (p_shop_id is null or c.shop_id = p_shop_id);
end $$;