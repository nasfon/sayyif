-- ============================================================================
-- IMS — Manual credits (off-sale credit recorded against a customer)
--
-- Manual credits let staff record credit owed by a customer without a sale
-- (adjustments, fees, off-system charges, corrections). They fold into
-- customers.total_credit and are paid down through record_credit_payment.
-- ============================================================================

create table if not exists public.manual_credits (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops (id) on delete restrict,
  customer_id     uuid not null references public.customers (id) on delete restrict,
  amount          numeric(14, 2) not null check (amount > 0),
  paid_amount     numeric(14, 2) not null default 0 check (paid_amount >= 0),
  remaining_credit numeric(14, 2) generated always as (greatest(amount - paid_amount, 0)) stored,
  reason          text check (reason is null or length(btrim(reason)) <= 500),
  created_by      uuid not null references public.users (id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_manual_credits_paid_bounds check (paid_amount <= amount)
);

create index if not exists idx_manual_credits_customer_created on public.manual_credits (customer_id, created_at desc);
create index if not exists idx_manual_credits_shop_created on public.manual_credits (shop_id, created_at desc);

comment on table public.manual_credits is 'Off-sale credit recorded against a customer; folds into customers.total_credit and is paid down via record_credit_payment.';

drop trigger if exists trg_manual_credits_updated_at on public.manual_credits;
create trigger trg_manual_credits_updated_at before update on public.manual_credits
  for each row execute function public.set_updated_at();

drop trigger if exists trg_manual_credits_set_shop on public.manual_credits;
create trigger trg_manual_credits_set_shop before insert on public.manual_credits
  for each row execute function public.credit_payments_set_shop_id();

drop trigger if exists trg_manual_credits_recompute_credit on public.manual_credits;
create trigger trg_manual_credits_recompute_credit after insert or update or delete on public.manual_credits
  for each row execute function public.recompute_customer_credit_on_change();

-- ----------------------------------------------------------------------------
-- recompute_customer_credit — include manual credits in the outstanding total
-- ----------------------------------------------------------------------------

create or replace function public.recompute_customer_credit(p_customer_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  update public.customers
     set total_credit = coalesce((
        select sum(s.remaining_credit)
          from public.sales s
         where s.customer_id = p_customer_id
           and s.status <> 'reversed'
      ), 0) + coalesce((
        select sum(m.remaining_credit)
          from public.manual_credits m
         where m.customer_id = p_customer_id
      ), 0)
   where id = p_customer_id;
end $$;

-- ----------------------------------------------------------------------------
-- record_credit_payment — also allocate generic payments to manual credits
-- ----------------------------------------------------------------------------

create or replace function public.record_credit_payment(
  p_customer_id uuid,
  p_sale_id uuid default null,
  p_amount numeric default null,
  p_payment_method text default 'cash'
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_user      uuid := auth.uid();
  v_customer  public.customers;
  v_outstanding numeric(14, 2);
  v_payment_id uuid;
  v_remaining numeric(14, 2);
  v_sale      public.sales;
  v_mc        public.manual_credits;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not (public.auth_is_super_admin() or public.auth_is_shop_admin()) then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select c.* into v_customer
    from public.customers c
   where c.id = p_customer_id
     and c.deleted_at is null
    for update;
  if not found then
    raise exception 'customer_not_found';
  end if;
  if not public.auth_is_super_admin() and v_customer.shop_id is distinct from public.auth_shop_id() then
    raise exception 'shop_mismatch';
  end if;

  if p_sale_id is not null then
    select s.* into v_sale
      from public.sales s
     where s.id = p_sale_id
       and s.customer_id = p_customer_id
       and s.status <> 'reversed'
      for update;
    if not found then
      raise exception 'sale_not_found';
    end if;
    if not public.auth_is_super_admin() and v_sale.shop_id is distinct from v_customer.shop_id then
      raise exception 'shop_mismatch';
    end if;
    if p_amount > v_sale.remaining_credit then
      raise exception 'exceeds_outstanding';
    end if;
  else
    select coalesce(sum(s.remaining_credit), 0)
      into v_outstanding
      from public.sales s
     where s.customer_id = p_customer_id
       and s.status <> 'reversed';
    select v_outstanding + coalesce(sum(m.remaining_credit), 0)
      into v_outstanding
      from public.manual_credits m
     where m.customer_id = p_customer_id;
    if p_amount > v_outstanding then
      raise exception 'exceeds_outstanding';
    end if;
  end if;

  insert into public.credit_payments (shop_id, customer_id, sale_id, amount, payment_method, received_by)
  values (v_customer.shop_id, p_customer_id, p_sale_id, p_amount, p_payment_method, v_user)
  returning id into v_payment_id;

  if p_sale_id is not null then
    update public.sales
       set amount_paid = amount_paid + p_amount
     where id = p_sale_id;
  else
    v_remaining := p_amount;
    for v_sale in
      select s.* from public.sales s
       where s.customer_id = p_customer_id
         and s.status <> 'reversed'
         and s.remaining_credit > 0
       order by s.created_at
       for update
    loop
      if v_remaining <= 0 then
        exit;
      end if;
      update public.sales
         set amount_paid = amount_paid + least(v_sale.remaining_credit, v_remaining)
       where id = v_sale.id;
      v_remaining := v_remaining - least(v_sale.remaining_credit, v_remaining);
    end loop;
    for v_mc in
      select m.* from public.manual_credits m
       where m.customer_id = p_customer_id
         and m.remaining_credit > 0
       order by m.created_at
       for update
    loop
      if v_remaining <= 0 then
        exit;
      end if;
      update public.manual_credits
         set paid_amount = paid_amount + least(v_mc.remaining_credit, v_remaining)
       where id = v_mc.id;
      v_remaining := v_remaining - least(v_mc.remaining_credit, v_remaining);
    end loop;
  end if;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (v_customer.shop_id, v_user, 'credit_payment_recorded', 'credit_payment', v_payment_id);

  return v_payment_id;
end $$;

-- ----------------------------------------------------------------------------
-- record_manual_credit — create an off-sale credit entry for a customer
-- ----------------------------------------------------------------------------

create or replace function public.record_manual_credit(
  p_customer_id uuid,
  p_amount numeric,
  p_reason text default null
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_user      uuid := auth.uid();
  v_customer  public.customers;
  v_credit_id uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not (public.auth_is_super_admin() or public.auth_is_shop_admin()) then
    raise exception 'forbidden';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select c.* into v_customer
    from public.customers c
   where c.id = p_customer_id
     and c.deleted_at is null
    for update;
  if not found then
    raise exception 'customer_not_found';
  end if;
  if not public.auth_is_super_admin() and v_customer.shop_id is distinct from public.auth_shop_id() then
    raise exception 'shop_mismatch';
  end if;

  insert into public.manual_credits (shop_id, customer_id, amount, reason, created_by)
  values (v_customer.shop_id, p_customer_id, p_amount, nullif(btrim(p_reason), ''), v_user)
  returning id into v_credit_id;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (v_customer.shop_id, v_user, 'manual_credit_recorded', 'manual_credit', v_credit_id);

  return v_credit_id;
end $$;

-- ----------------------------------------------------------------------------
-- Row Level Security — reads scoped to shop; writes only via RPC
-- ----------------------------------------------------------------------------

alter table public.manual_credits enable row level security;

drop policy if exists manual_credits_select on public.manual_credits;
create policy manual_credits_select on public.manual_credits for select to authenticated
  using (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
