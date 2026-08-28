-- ============================================================================
-- IMS — Initial Schema (MVP)
-- PostgreSQL 15+ / Supabase
--
-- Design follows docs/Database Schema Guide.md and docs/Database Design Document.md
--   * UUID PKs, explicit FKs with ON DELETE, named constraints
--   * Money as numeric(14,2), timestamps as timestamptz
--   * Shop-scoped RLS, soft delete on products/customers/users
--   * Derived aggregates maintained by triggers in the same transaction
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.shops (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) > 0),
  phone          text,
  email          text,
  address        text,
  logo_url       text,
  receipt_footer text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.shops is 'Each business location.';

create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint chk_roles_name_valid check (name in ('super_admin', 'shop_admin', 'cashier'))
);

comment on table public.roles is 'System roles: super_admin, shop_admin, cashier.';

create table if not exists public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  shop_id       uuid references public.shops (id) on delete restrict,
  role_id       uuid not null references public.roles (id) on delete restrict,
  full_name     text not null check (length(btrim(full_name)) > 0),
  email         text not null,
  phone         text,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  deleted_at    timestamptz,
  deleted_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.users is 'App users linked to Supabase auth.users; shop_id is null for super admins.';

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops (id) on delete cascade,
  name          text not null check (length(btrim(name)) > 0),
  sku           text not null check (length(btrim(sku)) > 0),
  quantity      integer not null default 0 check (quantity >= 0),
  selling_price numeric(14, 2) not null check (selling_price > 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  is_active     boolean not null default true,
  deleted_at    timestamptz,
  deleted_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint uq_products_shop_sku unique (shop_id, sku)
);

comment on table public.products is 'Inventory items; soft-deleted. quantity is a live ledger maintained by stock movement.';

create table if not exists public.customers (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete cascade,
  full_name    text not null check (length(btrim(full_name)) > 0),
  phone        text not null check (length(btrim(phone)) > 0),
  email        text,
  address      text,
  total_credit numeric(14, 2) not null default 0 check (total_credit >= 0),
  deleted_at   timestamptz,
  deleted_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.customers is 'Soft-deleted. total_credit is maintained by triggers from sales.remaining_credit.';

create table if not exists public.sales (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops (id) on delete restrict,
  customer_id      uuid references public.customers (id) on delete set null,
  cashier_id       uuid not null references public.users (id) on delete restrict,
  receipt_number   text not null unique check (length(btrim(receipt_number)) > 0),
  subtotal         numeric(14, 2) not null check (subtotal >= 0),
  total            numeric(14, 2) not null check (total > 0),
  amount_paid      numeric(14, 2) not null default 0 check (amount_paid >= 0),
  remaining_credit numeric(14, 2) generated always as (greatest(total - amount_paid, 0)) stored,
  payment_method   text not null default 'cash'
    check (payment_method in ('cash', 'card', 'transfer', 'credit')),
  status           text not null default 'completed'
    check (status in ('completed', 'corrected', 'reversed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint chk_sales_total_consistency check (total = subtotal),
  constraint chk_sales_amount_paid_bounds check (amount_paid <= total)
);

comment on table public.sales is 'Immutable transaction record; never deleted. remaining_credit is a generated column (total - amount_paid) maintained by the database.';

create sequence if not exists public.receipt_number_seq;

create table if not exists public.sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales (id) on delete cascade,
  product_id   uuid references public.products (id) on delete restrict,
  product_name text not null check (length(btrim(product_name)) > 0),
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(14, 2) not null check (unit_price > 0),
  total_price  numeric(14, 2) not null check (total_price > 0),
  created_at   timestamptz not null default now(),
  constraint chk_sale_items_price_consistency check (total_price = quantity * unit_price)
);

comment on table public.sale_items is 'Snapshot of the sale line; product_name preserved for immutable receipts.';

create table if not exists public.credit_payments (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references public.shops (id) on delete restrict,
  customer_id    uuid not null references public.customers (id) on delete restrict,
  sale_id        uuid references public.sales (id) on delete restrict,
  amount         numeric(14, 2) not null check (amount > 0),
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'card', 'transfer')),
  received_by    uuid not null references public.users (id) on delete restrict,
  created_at     timestamptz not null default now()
);

comment on table public.credit_payments is 'Immutable; shop_id is denormalized from the customer for sargable RLS.';

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  shop_id      uuid not null references public.shops (id) on delete restrict,
  description  text not null check (length(btrim(description)) > 0),
  amount       numeric(14, 2) not null check (amount > 0),
  expense_date date not null default current_date,
  recorded_by  uuid not null references public.users (id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.stock_history (
  id               uuid primary key default gen_random_uuid(),
  shop_id          uuid not null references public.shops (id) on delete restrict,
  product_id       uuid not null references public.products (id) on delete restrict,
  change_type      text not null
    check (change_type in ('sale', 'manual_adjustment', 'sale_correction', 'reversal')),
  quantity_before  integer not null check (quantity_before >= 0),
  quantity_changed integer not null check (quantity_changed <> 0),
  quantity_after   integer not null check (quantity_after >= 0),
  reference_type   text,
  reference_id     uuid,
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint chk_stock_history_ledger check (quantity_after = quantity_before + quantity_changed)
);

comment on table public.stock_history is 'Immutable audit of every stock movement; written inside the same transaction as the change.';

create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  shop_id    uuid references public.shops (id) on delete restrict,
  user_id    uuid references public.users (id) on delete set null,
  action     text not null check (length(btrim(action)) > 0),
  entity     text not null check (length(btrim(entity)) > 0),
  entity_id  uuid,
  reason     text,
  ip_address text,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Immutable; written inside the same transaction as the audited operation.';

create table if not exists public.business_settings (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null unique references public.shops (id) on delete cascade,
  business_name  text not null check (length(btrim(business_name)) > 0),
  phone          text,
  address        text,
  logo_url       text,
  receipt_footer text,
  updated_by     uuid references public.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes — every FK column plus the hot query paths (guide section 2)
-- ----------------------------------------------------------------------------

create index if not exists idx_users_shop_id      on public.users (shop_id);
create index if not exists idx_users_role_id      on public.users (role_id);
create unique index if not exists uq_users_active_email on public.users (email) where deleted_at is null;

create index if not exists idx_products_shop_created on public.products (shop_id, created_at desc);
create index if not exists idx_products_shop_quantity on public.products (shop_id, quantity);

create index if not exists idx_customers_shop_created on public.customers (shop_id, created_at desc);
create index if not exists idx_customers_shop_phone    on public.customers (shop_id, phone);

create index if not exists idx_sales_shop_created on public.sales (shop_id, created_at desc);
create index if not exists idx_sales_shop_customer on public.sales (shop_id, customer_id);
create index if not exists idx_sales_customer_id  on public.sales (customer_id);
create index if not exists idx_sales_cashier_id   on public.sales (cashier_id);

create index if not exists idx_sale_items_sale_id    on public.sale_items (sale_id);
create index if not exists idx_sale_items_product_id on public.sale_items (product_id);

create index if not exists idx_credit_payments_customer_created on public.credit_payments (customer_id, created_at desc);
create index if not exists idx_credit_payments_sale_id          on public.credit_payments (sale_id);
create index if not exists idx_credit_payments_shop_created     on public.credit_payments (shop_id, created_at desc);
create index if not exists idx_credit_payments_received_by      on public.credit_payments (received_by);

create index if not exists idx_expenses_shop_date on public.expenses (shop_id, expense_date desc);
create index if not exists idx_expenses_recorded_by on public.expenses (recorded_by);

create index if not exists idx_stock_history_product_created on public.stock_history (product_id, created_at desc);
create index if not exists idx_stock_history_shop_created    on public.stock_history (shop_id, created_at desc);
create index if not exists idx_stock_history_reference       on public.stock_history (reference_type, reference_id);

create index if not exists idx_audit_logs_shop_created on public.audit_logs (shop_id, created_at desc);
create index if not exists idx_audit_logs_user_created on public.audit_logs (user_id, created_at desc);
create index if not exists idx_audit_logs_entity       on public.audit_logs (entity, entity_id);

-- ----------------------------------------------------------------------------
-- RLS helper functions (after tables so SQL function bodies validate)
-- ----------------------------------------------------------------------------

create or replace function public.auth_shop_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select u.shop_id
  from public.users u
  where u.id = auth.uid()
    and u.deleted_at is null
    and u.is_active
$$;

create or replace function public.auth_role_name() returns text
  language sql stable security definer set search_path = public as $$
  select r.name
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid()
    and u.deleted_at is null
    and u.is_active
$$;

create or replace function public.auth_is_super_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select public.auth_role_name() = 'super_admin' $$;

create or replace function public.auth_is_shop_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select public.auth_role_name() = 'shop_admin' $$;

create or replace function public.auth_is_cashier() returns boolean
  language sql stable security definer set search_path = public as
  $$ select public.auth_role_name() = 'cashier' $$;

-- ----------------------------------------------------------------------------
-- Trigger functions
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.recompute_customer_credit(p_customer_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
begin
  update public.customers
     set total_credit = coalesce((
       select sum(s.remaining_credit)
         from public.sales s
        where s.customer_id = p_customer_id
          and s.status <> 'reversed'
     ), 0)
   where id = p_customer_id;
end $$;

create or replace function public.credit_payments_set_shop_id() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_shop uuid;
begin
  select shop_id into v_shop from public.customers where id = new.customer_id;
  if v_shop is null then
    raise exception 'customer_not_found';
  end if;
  new.shop_id := v_shop;
  return new;
end $$;

create or replace function public.recompute_customer_credit_on_change() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.customer_id is not null then
      perform public.recompute_customer_credit(old.customer_id);
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.customer_id is distinct from new.customer_id then
    if old.customer_id is not null then
      perform public.recompute_customer_credit(old.customer_id);
    end if;
  end if;
  if new.customer_id is not null then
    perform public.recompute_customer_credit(new.customer_id);
  end if;
  return new;
end $$;

create or replace function public.users_validate_role_scope() returns trigger
  language plpgsql security definer set search_path = public as $$
declare
  v_super_admin uuid;
begin
  select id into v_super_admin from public.roles where name = 'super_admin';

  if new.role_id = v_super_admin then
    if new.shop_id is not null then
      raise exception 'super_admin_cannot_have_shop';
    end if;
  elsif new.shop_id is null then
    raise exception 'shop_required';
  end if;

  if not public.auth_is_super_admin() and new.shop_id is distinct from public.auth_shop_id() then
    raise exception 'shop_mismatch';
  end if;

  return new;
end $$;

create or replace function public.shops_create_settings() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.business_settings (shop_id, business_name)
  values (new.id, new.name);
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists trg_shops_updated_at on public.shops;
create trigger trg_shops_updated_at before update on public.shops
  for each row execute function public.set_updated_at();
drop trigger if exists trg_shops_create_settings on public.shops;
create trigger trg_shops_create_settings after insert on public.shops
  for each row execute function public.shops_create_settings();

drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at before update on public.roles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
drop trigger if exists trg_users_validate_role_scope on public.users;
create trigger trg_users_validate_role_scope before insert or update on public.users
  for each row execute function public.users_validate_role_scope();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sales_updated_at on public.sales;
create trigger trg_sales_updated_at before update on public.sales
  for each row execute function public.set_updated_at();
drop trigger if exists trg_sales_recompute_credit on public.sales;
create trigger trg_sales_recompute_credit after insert or update or delete on public.sales
  for each row execute function public.recompute_customer_credit_on_change();

drop trigger if exists trg_credit_payments_set_shop on public.credit_payments;
create trigger trg_credit_payments_set_shop before insert on public.credit_payments
  for each row execute function public.credit_payments_set_shop_id();
drop trigger if exists trg_credit_payments_recompute_credit on public.credit_payments;
create trigger trg_credit_payments_recompute_credit after insert or update or delete on public.credit_payments
  for each row execute function public.recompute_customer_credit_on_change();

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

drop trigger if exists trg_business_settings_updated_at on public.business_settings;
create trigger trg_business_settings_updated_at before update on public.business_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.shops            enable row level security;
alter table public.roles            enable row level security;
alter table public.users            enable row level security;
alter table public.products         enable row level security;
alter table public.customers        enable row level security;
alter table public.sales            enable row level security;
alter table public.sale_items       enable row level security;
alter table public.credit_payments  enable row level security;
alter table public.expenses         enable row level security;
alter table public.stock_history    enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.business_settings enable row level security;

-- Shops ----------------------------------------------------------------------
drop policy if exists shops_select on public.shops;
create policy shops_select on public.shops for select to authenticated
  using (public.auth_is_super_admin() or id = public.auth_shop_id());
drop policy if exists shops_insert on public.shops;
create policy shops_insert on public.shops for insert to authenticated
  with check (public.auth_is_super_admin());
drop policy if exists shops_update on public.shops;
create policy shops_update on public.shops for update to authenticated
  using (public.auth_is_super_admin())
  with check (public.auth_is_super_admin());
drop policy if exists shops_delete on public.shops;
create policy shops_delete on public.shops for delete to authenticated
  using (public.auth_is_super_admin());

-- Roles ----------------------------------------------------------------------
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles for select to authenticated
  using (auth.uid() is not null);
drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles for insert to authenticated
  with check (public.auth_is_super_admin());
drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles for update to authenticated
  using (public.auth_is_super_admin())
  with check (public.auth_is_super_admin());
drop policy if exists roles_delete on public.roles;
create policy roles_delete on public.roles for delete to authenticated
  using (public.auth_is_super_admin());

-- Users ----------------------------------------------------------------------
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (
    id = auth.uid()
    or public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists users_insert on public.users;
create policy users_insert on public.users for insert to authenticated
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  )
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );

-- Products / Customers (cashier is read-only, soft delete via UPDATE) ----------
drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id());
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert to authenticated
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists products_update on public.products;
create policy products_update on public.products for update to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id())
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id());
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id())
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );

-- Sales (read via Data API; all writes go through create_sale/correct_sale/reverse_sale RPCs) --
drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales for select to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id());

-- Sale items (read via parent sale; writes only via RPC) -----------------------
drop policy if exists sale_items_select on public.sale_items;
create policy sale_items_select on public.sale_items for select to authenticated
  using (
    public.auth_is_super_admin()
    or exists (
      select 1 from public.sales s
      where s.id = sale_id and s.shop_id = public.auth_shop_id()
    )
  );

-- Credit payments (read-only via Data API; created only through record_credit_payment) --
drop policy if exists credit_payments_select on public.credit_payments;
create policy credit_payments_select on public.credit_payments for select to authenticated
  using (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );

-- Expenses (shop admins and above) ---------------------------------------------
drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses for select to authenticated
  using (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert to authenticated
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update to authenticated
  using (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  )
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete to authenticated
  using (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );

-- Stock history (read-only via Data API; written inside RPCs) ------------------
drop policy if exists stock_history_select on public.stock_history;
create policy stock_history_select on public.stock_history for select to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id());

-- Audit logs -------------------------------------------------------------------
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id());
drop policy if exists audit_logs_insert on public.audit_logs;
create policy audit_logs_insert on public.audit_logs for insert to authenticated
  with check (public.auth_is_super_admin());

-- Business settings -------------------------------------------------------------
drop policy if exists business_settings_select on public.business_settings;
create policy business_settings_select on public.business_settings for select to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id());
drop policy if exists business_settings_insert on public.business_settings;
create policy business_settings_insert on public.business_settings for insert to authenticated
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );
drop policy if exists business_settings_update on public.business_settings;
create policy business_settings_update on public.business_settings for update to authenticated
  using (public.auth_is_super_admin() or shop_id = public.auth_shop_id())
  with check (
    public.auth_is_super_admin()
    or (shop_id = public.auth_shop_id() and public.auth_is_shop_admin())
  );

-- Derived credit column is maintained by triggers/RPCs only — clients must not write it
revoke insert (total_credit) on table public.customers from anon, authenticated;
revoke update (total_credit) on table public.customers from anon, authenticated;

-- ----------------------------------------------------------------------------
-- Seed data
-- ----------------------------------------------------------------------------

insert into public.roles (name, description)
values
  ('super_admin', 'Full access across all shops'),
  ('shop_admin',  'Manages a single assigned shop'),
  ('cashier',     'Runs sales and prints receipts in a single shop')
on conflict (name) do nothing;
