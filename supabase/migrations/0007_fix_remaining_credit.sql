-- ============================================================================
-- IMS — Fix remaining_credit generated column
--
-- sales.remaining_credit must be a stored generated column that always equals
-- greatest(total - amount_paid, 0). When the column exists as a plain column
-- (or with a stale definition), outstanding balances are lost: remaining_credit
-- reads 0 and customer.total_credit (maintained by the sales trigger) stays 0.
--
-- This migration redefines the column and backfills both the sale balances and
-- every customer's total_credit from the immutable sales ledger.
-- ============================================================================

alter table public.sales
  drop column remaining_credit;

alter table public.sales
  add column remaining_credit numeric(14, 2)
    generated always as (greatest(total - amount_paid, 0)) stored;

-- Backfill customer balances from the corrected sale ledger
update public.customers c
   set total_credit = coalesce((
     select sum(s.remaining_credit)
       from public.sales s
      where s.customer_id = c.id
        and s.status <> 'reversed'
   ), 0)
 where c.deleted_at is null;