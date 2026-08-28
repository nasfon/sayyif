-- ============================================================================
-- IMS — Dashboard summary (read-only aggregate RPC)
--
-- Serves the Dashboard page widgets: total products, total customers, today's
-- sales, today's revenue, all-time revenue, outstanding credit, total expenses,
-- low stock count, and the most recent sales.
--
-- * Aggregates run in SQL per docs/Database Schema Guide.md section 6; the
--   client receives numbers, never a full table to sum up.
-- * Scoped to the caller's shop unless the caller is a super admin; a super
--   admin may pass p_shop_id to scope to one shop or null for all shops.
-- * Reversed sales are excluded from sales/revenue figures (voided
--   transactions are not business).
-- * Recent sales is capped at 8 rows (dashboard widget, not a paginated list).
-- ============================================================================

create or replace function public.dashboard_summary(
  p_shop_id uuid default null
) returns table (
  total_products     bigint,
  total_customers    bigint,
  sales_today        bigint,
  revenue_today      numeric(14, 2),
  total_revenue      numeric(14, 2),
  outstanding_credit numeric(14, 2),
  total_expenses     numeric(14, 2),
  low_stock_count    bigint,
  recent_sales       jsonb
)
  language plpgsql security definer set search_path = public as $$
declare
  v_scope uuid;
begin
  if not public.auth_is_super_admin() then
    v_scope := public.auth_shop_id();
    if p_shop_id is not null and p_shop_id is distinct from v_scope then
      raise exception 'shop_mismatch';
    end if;
  else
    v_scope := p_shop_id;
  end if;

  return query
    select
      (select count(*)::bigint
         from public.products p
        where p.deleted_at is null
          and p.is_active
          and (v_scope is null or p.shop_id = v_scope)),
      (select count(*)::bigint
         from public.customers c
        where c.deleted_at is null
          and (v_scope is null or c.shop_id = v_scope)),
      (select count(*)::bigint
         from public.sales s
        where s.status <> 'reversed'
          and s.created_at >= date_trunc('day', now())
          and (v_scope is null or s.shop_id = v_scope)),
      coalesce((select sum(s.total)
                  from public.sales s
                 where s.status <> 'reversed'
                   and s.created_at >= date_trunc('day', now())
                   and (v_scope is null or s.shop_id = v_scope)), 0)::numeric(14, 2),
      coalesce((select sum(s.total)
                  from public.sales s
                 where s.status <> 'reversed'
                   and (v_scope is null or s.shop_id = v_scope)), 0)::numeric(14, 2),
      coalesce((select sum(c.total_credit)
                  from public.customers c
                 where c.deleted_at is null
                   and c.total_credit > 0
                   and (v_scope is null or c.shop_id = v_scope)), 0)::numeric(14, 2),
      coalesce((select sum(e.amount)
                  from public.expenses e
                 where (v_scope is null or e.shop_id = v_scope)), 0)::numeric(14, 2),
      (select count(*)::bigint
         from public.products p
        where p.deleted_at is null
          and p.is_active
          and p.quantity <= p.minimum_stock
          and (v_scope is null or p.shop_id = v_scope)),
      (select coalesce(jsonb_agg(jsonb_build_object(
                 'id', s.id,
                 'receipt_number', s.receipt_number,
                 'total', s.total,
                 'payment_method', s.payment_method,
                 'status', s.status,
                 'created_at', s.created_at
               ) order by s.created_at desc), '[]'::jsonb)
         from (select s.id,
                      s.receipt_number,
                      s.total,
                      s.payment_method,
                      s.status,
                      s.created_at
                 from public.sales s
                where s.status <> 'reversed'
                  and (v_scope is null or s.shop_id = v_scope)
                order by s.created_at desc
                limit 8) s);
end $$;