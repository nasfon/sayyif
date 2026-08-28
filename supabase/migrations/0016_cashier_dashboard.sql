-- ============================================================================
-- IMS — Cashier dashboard (role-restricted least-privilege)
--
-- Previously every role called the same `dashboard_summary` RPC, which returns
-- revenue, outstanding credit, expenses and low-stock figures. That exposed
-- business financials to point-of-sale staff.
--
-- This migration:
--   1. Locks `dashboard_summary` to super_admin / shop_admin (cashier → forbidden).
--   2. Adds `cashier_dashboard`, which returns only the shop's daily sales
--      *count* and the caller's own five most recent sales. No money totals,
--      no credit/expense/inventory figures.
-- ============================================================================

-- 1. Restrict the full dashboard to non-cashier roles -------------------------

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
  if public.auth_is_cashier() then
    raise exception 'forbidden';
  end if;

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

-- 2. Cashier home --------------------------------------------------------------

create or replace function public.cashier_dashboard()
returns table (
  sales_today  bigint,
  recent_sales jsonb
)
  language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_shop uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  v_shop := public.auth_shop_id();

  return query
    select
      (select count(*)::bigint
         from public.sales s
        where s.status <> 'reversed'
          and s.created_at >= date_trunc('day', now())
          and s.shop_id = v_shop),
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
                where s.cashier_id = v_uid
                  and s.status <> 'reversed'
                  and s.shop_id = v_shop
                order by s.created_at desc
                limit 5) s);
end $$;
