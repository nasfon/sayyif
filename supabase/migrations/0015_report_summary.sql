-- ============================================================================
-- IMS — Report summary (read-only aggregate RPC)
--
-- Serves the Reports page: sales, revenue, expenses, credit, and inventory
-- cards scoped by optional shop and date range.
--
-- * Aggregates run in SQL per docs/Database Schema Guide.md section 6; the
--   client receives numbers, never a full table to sum up.
-- * Scoped to the caller's shop unless the caller is a super admin; a super
--   admin may pass p_shop_id to scope to one shop or null for all shops.
-- * Reversed sales are excluded from sales/revenue figures (voided
--   transactions are not business).
-- * Dates are inclusive on both ends; sales/credit payments use created_at,
--   expenses use expense_date.
-- ============================================================================

create or replace function public.report_summary(
  p_shop_id uuid default null,
  p_date_from date default null,
  p_date_to date default null
) returns table (
  sales_count        bigint,
  sales_total        numeric(14, 2),
  expenses_total     numeric(14, 2),
  credit_outstanding numeric(14, 2),
  credit_collected   numeric(14, 2),
  products_total     bigint,
  low_stock_count    bigint,
  inventory_value    numeric(14, 2),
  net_profit         numeric(14, 2)
)
  language plpgsql security definer set search_path = public as $$
declare
  v_scope uuid;
  v_from timestamptz;
  v_to timestamptz;
begin
  if not public.auth_is_super_admin() then
    v_scope := public.auth_shop_id();
    if p_shop_id is not null and p_shop_id is distinct from v_scope then
      raise exception 'shop_mismatch';
    end if;
  else
    v_scope := p_shop_id;
  end if;

  if p_date_from is not null then
    v_from := (p_date_from || ' 00:00:00')::timestamptz;
  end if;
  if p_date_to is not null then
    v_to := (p_date_to || ' 23:59:59.999')::timestamptz;
  end if;

  return query
    select
      coalesce((select count(*)::bigint
                  from public.sales s
                 where s.status <> 'reversed'
                   and (v_scope is null or s.shop_id = v_scope)
                   and (v_from is null or s.created_at >= v_from)
                   and (v_to is null or s.created_at <= v_to)), 0),
      coalesce((select sum(s.total)::numeric(14, 2)
                  from public.sales s
                 where s.status <> 'reversed'
                   and (v_scope is null or s.shop_id = v_scope)
                   and (v_from is null or s.created_at >= v_from)
                   and (v_to is null or s.created_at <= v_to)), 0),
      coalesce((select sum(e.amount)::numeric(14, 2)
                  from public.expenses e
                 where (v_scope is null or e.shop_id = v_scope)
                   and (p_date_from is null or e.expense_date >= p_date_from)
                   and (p_date_to is null or e.expense_date <= p_date_to)), 0),
      coalesce((select sum(c.total_credit)::numeric(14, 2)
                  from public.customers c
                 where c.deleted_at is null
                   and c.total_credit > 0
                   and (v_scope is null or c.shop_id = v_scope)), 0),
      coalesce((select sum(cp.amount)::numeric(14, 2)
                  from public.credit_payments cp
                 where (v_scope is null or cp.shop_id = v_scope)
                   and (v_from is null or cp.created_at >= v_from)
                   and (v_to is null or cp.created_at <= v_to)), 0),
      coalesce((select count(*)::bigint
                  from public.products p
                 where p.deleted_at is null
                   and p.is_active
                   and (v_scope is null or p.shop_id = v_scope)), 0),
      coalesce((select count(*)::bigint
                  from public.products p
                 where p.deleted_at is null
                   and p.is_active
                   and p.quantity <= p.minimum_stock
                   and (v_scope is null or p.shop_id = v_scope)), 0),
      coalesce((select sum(p.selling_price * p.quantity)::numeric(14, 2)
                  from public.products p
                 where p.deleted_at is null
                   and p.is_active
                   and (v_scope is null or p.shop_id = v_scope)), 0),
      (
        coalesce((select sum(s.total)::numeric(14, 2)
                    from public.sales s
                   where s.status <> 'reversed'
                     and (v_scope is null or s.shop_id = v_scope)
                     and (v_from is null or s.created_at >= v_from)
                     and (v_to is null or s.created_at <= v_to)), 0)
        - coalesce((select sum(e.amount)::numeric(14, 2)
                      from public.expenses e
                     where (v_scope is null or e.shop_id = v_scope)
                       and (p_date_from is null or e.expense_date >= p_date_from)
                       and (p_date_to is null or e.expense_date <= p_date_to)), 0)
      )::numeric(14, 2);
end $$;
