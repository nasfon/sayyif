-- ============================================================================
-- IMS — Transactional RPC Functions (MVP)
--
-- Atomic operations per docs/API Specification.md and docs/Database Schema Guide.md
-- section 10. Every function validates the caller's role/shop, recomputes money
-- in SQL (never trusts client totals), and writes stock history + audit log in
-- the same transaction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- create_sale — sale + items + stock deduction + history + audit, atomically
-- ----------------------------------------------------------------------------

create or replace function public.create_sale(
  p_shop_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_amount_paid numeric,
  p_payment_method text default 'cash'
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_cashier  uuid := auth.uid();
  v_item     jsonb;
  v_product  public.products;
  v_qty      integer;
  v_line     numeric(14, 2);
  v_subtotal numeric(14, 2) := 0;
  v_total    numeric(14, 2);
  v_receipt  text;
  v_sale_id  uuid;
begin
  if v_cashier is null then
    raise exception 'not_authenticated';
  end if;
  if not public.auth_is_super_admin() and p_shop_id is distinct from public.auth_shop_id() then
    raise exception 'shop_mismatch';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_items';
  end if;
  if p_amount_paid < 0 then
    raise exception 'negative_payment';
  end if;
  if p_payment_method = 'credit' and p_customer_id is null then
    raise exception 'credit_requires_customer';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select p.* into v_product
      from public.products p
     where p.id = (v_item ->> 'product_id')::uuid
       and p.shop_id = p_shop_id
       and p.deleted_at is null
       and p.is_active
     for update;

    if not found then
      raise exception 'product_not_found';
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty <= 0 then
      raise exception 'invalid_quantity';
    end if;
    if v_qty > v_product.quantity then
      raise exception 'insufficient_stock';
    end if;

    v_line := v_product.selling_price * v_qty;
    v_subtotal := v_subtotal + v_line;
  end loop;

  v_total := v_subtotal;
  if p_amount_paid > v_total then
    raise exception 'overpayment';
  end if;

  v_receipt := 'RCP-' || to_char(now(), 'YYYYMMDD') || '-'
    || lpad(nextval('public.receipt_number_seq')::text, 6, '0');

  insert into public.sales (
    shop_id, customer_id, cashier_id, receipt_number,
    subtotal, total, amount_paid, payment_method, status
  )
  values (
    p_shop_id, p_customer_id, v_cashier, v_receipt,
    v_subtotal, v_total, p_amount_paid, p_payment_method, 'completed'
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select p.* into v_product
      from public.products p
     where p.id = (v_item ->> 'product_id')::uuid;

    v_qty := (v_item ->> 'quantity')::integer;
    v_line := v_product.selling_price * v_qty;

    insert into public.sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
    values (v_sale_id, v_product.id, v_product.name, v_qty, v_product.selling_price, v_line);

    update public.products
       set quantity = quantity - v_qty
     where id = v_product.id;

    insert into public.stock_history
      (shop_id, product_id, change_type, quantity_before, quantity_changed, quantity_after,
       reference_type, reference_id, created_by)
    values
      (p_shop_id, v_product.id, 'sale', v_product.quantity, -v_qty, v_product.quantity - v_qty,
       'sale', v_sale_id, v_cashier);
  end loop;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (p_shop_id, v_cashier, 'sale_created', 'sale', v_sale_id);

  return v_sale_id;
end $$;

-- ----------------------------------------------------------------------------
-- correct_sale — restore old items, apply new items, recompute totals
-- ----------------------------------------------------------------------------

create or replace function public.correct_sale(
  p_sale_id uuid,
  p_items jsonb,
  p_reason text
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := auth.uid();
  v_sale    public.sales;
  v_item    jsonb;
  v_product public.products;
  v_qty     integer;
  v_line    numeric(14, 2);
  v_subtotal numeric(14, 2) := 0;
  v_paid    numeric(14, 2);
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not (public.auth_is_super_admin() or public.auth_is_shop_admin()) then
    raise exception 'forbidden';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_items';
  end if;

  select s.* into v_sale
    from public.sales s
   where s.id = p_sale_id
     for update;
  if not found then
    raise exception 'sale_not_found';
  end if;
  if not public.auth_is_super_admin() and v_sale.shop_id is distinct from public.auth_shop_id() then
    raise exception 'shop_mismatch';
  end if;
  if v_sale.status = 'reversed' then
    raise exception 'cannot_correct_reversed';
  end if;

  -- restore stock for the original lines
  for v_item in
    select jsonb_build_object('product_id', si.product_id, 'quantity', si.quantity) as v
      from public.sale_items si
     where si.sale_id = p_sale_id
  loop
    select p.* into v_product
      from public.products p
     where p.id = (v_item ->> 'product_id')::uuid
     for update;
    if found then
      v_qty := (v_item ->> 'quantity')::integer;
      update public.products
         set quantity = quantity + v_qty
       where id = v_product.id;
      insert into public.stock_history
        (shop_id, product_id, change_type, quantity_before, quantity_changed, quantity_after,
         reference_type, reference_id, created_by)
      values
        (v_sale.shop_id, v_product.id, 'sale_correction', v_product.quantity, v_qty,
         v_product.quantity + v_qty, 'sale', p_sale_id, v_user);
    end if;
  end loop;

  delete from public.sale_items where sale_id = p_sale_id;

  -- validate new lines and compute new totals
  for v_item in select * from jsonb_array_elements(p_items) loop
    select p.* into v_product
      from public.products p
     where p.id = (v_item ->> 'product_id')::uuid
       and p.shop_id = v_sale.shop_id
       and p.deleted_at is null
     for update;
    if not found then
      raise exception 'product_not_found';
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty <= 0 then
      raise exception 'invalid_quantity';
    end if;
    if v_qty > v_product.quantity then
      raise exception 'insufficient_stock';
    end if;

    v_line := v_product.selling_price * v_qty;
    v_subtotal := v_subtotal + v_line;

    insert into public.sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
    values (p_sale_id, v_product.id, v_product.name, v_qty, v_product.selling_price, v_line);

    update public.products
       set quantity = quantity - v_qty
     where id = v_product.id;

    insert into public.stock_history
      (shop_id, product_id, change_type, quantity_before, quantity_changed, quantity_after,
       reference_type, reference_id, created_by)
    values
      (v_sale.shop_id, v_product.id, 'sale_correction', v_product.quantity, -v_qty,
       v_product.quantity - v_qty, 'sale', p_sale_id, v_user);
  end loop;

  -- money already received for this sale (initial payment + later credit payments)
  v_paid := v_sale.amount_paid;

  update public.sales
     set subtotal = v_subtotal,
         total = v_subtotal,
         amount_paid = least(v_paid, v_subtotal),
         status = 'corrected'
   where id = p_sale_id;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id, reason)
  values (
    v_sale.shop_id,
    v_user,
    'sale_corrected',
    'sale',
    p_sale_id,
    case when v_paid > v_subtotal
         then p_reason || ' (excess paid toward customer balance: ' || (v_paid - v_subtotal)::text || ')'
         else p_reason
    end
  );

  return p_sale_id;
end $$;

-- ----------------------------------------------------------------------------
-- reverse_sale — restore stock, void outstanding credit
-- ----------------------------------------------------------------------------

create or replace function public.reverse_sale(
  p_sale_id uuid,
  p_reason text
) returns uuid
  language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_sale public.sales;
  v_item public.sale_items;
  v_product public.products;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  if not (public.auth_is_super_admin() or public.auth_is_shop_admin()) then
    raise exception 'forbidden';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;

  select s.* into v_sale
    from public.sales s
   where s.id = p_sale_id
     for update;
  if not found then
    raise exception 'sale_not_found';
  end if;
  if not public.auth_is_super_admin() and v_sale.shop_id is distinct from public.auth_shop_id() then
    raise exception 'shop_mismatch';
  end if;
  if v_sale.status = 'reversed' then
    raise exception 'already_reversed';
  end if;

  for v_item in
    select * from public.sale_items where sale_id = p_sale_id
  loop
    select p.* into v_product
      from public.products p
     where p.id = v_item.product_id
     for update;
    if found then
      update public.products
         set quantity = quantity + v_item.quantity
       where id = v_item.product_id;
      insert into public.stock_history
        (shop_id, product_id, change_type, quantity_before, quantity_changed, quantity_after,
         reference_type, reference_id, created_by)
      values
        (v_sale.shop_id, v_item.product_id, 'reversal', v_product.quantity, v_item.quantity,
         v_product.quantity + v_item.quantity, 'sale', p_sale_id, v_user);
    end if;
  end loop;

  update public.sales
     set status = 'reversed'
   where id = p_sale_id;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id, reason)
  values (
    v_sale.shop_id,
    v_user,
    'sale_reversed',
    'sale',
    p_sale_id,
    case when v_sale.amount_paid > 0
         then p_reason || ' (refund owed: ' || v_sale.amount_paid::text || ')'
         else p_reason
    end
  );

  return p_sale_id;
end $$;

-- ----------------------------------------------------------------------------
-- record_credit_payment — validate outstanding, reduce credit, audit
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
  end if;

  insert into public.audit_logs (shop_id, user_id, action, entity, entity_id)
  values (v_customer.shop_id, v_user, 'credit_payment_recorded', 'credit_payment', v_payment_id);

  return v_payment_id;
end $$;
