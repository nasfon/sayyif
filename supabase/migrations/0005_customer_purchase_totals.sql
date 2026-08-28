-- ============================================================================
-- IMS — Customer purchase totals (read-only aggregate RPC)
--
-- Serves the Customers list "Total Purchases" column and the customer profile
-- stats. Aggregates run in SQL per docs/Database Schema Guide.md section 6;
-- the client receives numbers, never a full sales table to sum up.
--
-- * Scoped to the caller's shop unless the caller is a super admin.
-- * Reversed sales are excluded (voided transactions are not purchases).
-- * p_customer_id is optional so one function serves both the list and a
--   single-customer profile.
-- ============================================================================

create or replace function public.customer_purchase_totals(
  p_shop_id uuid default null,
  p_customer_id uuid default null
) returns table (
  customer_id   uuid,
  purchase_count bigint,
  total_spent   numeric(14, 2)
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
    select s.customer_id,
           count(*)::bigint,
           coalesce(sum(s.total), 0)::numeric(14, 2)
      from public.sales s
     where s.customer_id is not null
       and s.status <> 'reversed'
       and (p_shop_id is null or s.shop_id = p_shop_id)
       and (p_customer_id is null or s.customer_id = p_customer_id)
     group by s.customer_id;
end $$;